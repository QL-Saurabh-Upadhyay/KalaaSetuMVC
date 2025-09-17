import nest_asyncio
import os
from pyngrok import ngrok
from infograph_router import router as infograph_router
from fastapi import FastAPI, Request, Form, HTTPException
from groq import Groq
from PIL import Image
import io, json, base64
import torch
from diffusers import AutoPipelineForText2Image, DEISMultistepScheduler
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from fastapi.responses import JSONResponse, FileResponse

# --- TTS related imports ---
from pydantic import BaseModel
from transformers import AutoTokenizer
from parler_tts import ParlerTTSForConditionalGeneration
import soundfile as sf
import tempfile
import socket
import signal
import sys
import atexit

nest_asyncio.apply()

os.environ["GROQ_API_KEY"] = "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"

# Check for CUDA support
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# Load image generation model
pipe = AutoPipelineForText2Image.from_pretrained('lykon/dreamshaper-8', torch_dtype=torch.float16, variant="fp16")
pipe.scheduler = DEISMultistepScheduler.from_config(pipe.scheduler.config)
pipe = pipe.to(device)
pipe.enable_attention_slicing()
pipe.enable_vae_tiling()

# Initialize FastAPI
app = FastAPI()

# Store the public URL globally
public_url_global = None

@app.on_event("startup")
async def startup_event():
    """Display server information after startup"""
    global public_url_global
    if public_url_global:
        print("\n" + "=" * 60)
        print("✅ SERVER IS READY!")
        print("=" * 60)
        print(f"🌐 Public URL:  {public_url_global}")
        print(f"🏠 Local URL:   http://localhost:8081")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("✅ SERVER IS READY (LOCAL ONLY)!")
        print("=" * 60)
        print(f"🏠 Local URL:   http://localhost:8081")
        print("=" * 60)

# Mount infographics router
app.include_router(infograph_router, prefix="/infograph")

# Groq Client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
groq_client = client  # Fix: Create alias for consistency

# ------------------------
# TTS: language mapping, model loading, endpoints
# ------------------------
LANGUAGE_SPEAKERS = {
    "assamese": ["Amit", "Sita", "Poonam", "Rakesh"],
    "bengali": ["Arjun", "Aditi", "Tapan", "Rashmi", "Arnav", "Riya"],
    "bodo": ["Bikram", "Maya", "Kalpana"],
    "dogri": ["Karan"],
    "english": ["Thoma", "Mary", "Swapna", "Dinesh", "Meera", "Jatin", "Aakash", "Sneha", "Kabir", "Tisha", "Chingkhei", "Thoiba", "Priya", "Tarun", "Gauri", "Nisha", "Raghav", "Kavya", "Ravi", "Vikas", "Riya"],
    "gujarati": ["Yash", "Neha"],
    "hindi": ["Rohit", "Divya", "Aman", "Rani"],
    "kannada": ["Suresh", "Anu", "Chetan", "Vidya"],
    "malayalam": ["Anjali", "Anju", "Harish"],
    "manipuri": ["Laishram", "Ranjit"],
    "marathi": ["Sanjay", "Sunita", "Nikhil", "Radha", "Varun", "Isha"],
    "nepali": ["Amrita"],
    "odia": ["Manas", "Debjani"],
    "punjabi": ["Divjot", "Gurpreet"],
    "sanskrit": ["Aryan"],
    "tamil": ["Kavitha", "Jaya"],
    "telugu": ["Prakash", "Lalitha", "Kiran"]
}

# TTS model & tokenizers (loaded onto the same device variable)
tts_model = None
tts_tokenizer = None
description_tokenizer = None
model = None  # Fix: Add model variable
tokenizer = None  # Fix: Add tokenizer variable

try:
    tts_model = ParlerTTSForConditionalGeneration.from_pretrained("ai4bharat/indic-parler-tts").to(device)
    tts_tokenizer = AutoTokenizer.from_pretrained("ai4bharat/indic-parler-tts")
    description_tokenizer = AutoTokenizer.from_pretrained(tts_model.config.text_encoder._name_or_path)
    
    # Fix: Set the model and tokenizer variables for consistency
    model = tts_model
    tokenizer = tts_tokenizer
    
    print("TTS models loaded successfully")
except Exception as e:
    # Defer failures to runtime; log import/load issues
    print(f"TTS model or tokenizer failed to load: {e}")

class TTSRequest(BaseModel):
    text: str
    target_language: str = "hi"
    speaker: str = None
    style: str = None

def _build_description(request: TTSRequest, emotion: str) -> str:
    parts = []
    if request.speaker:
        parts.append(f"{request.speaker}'s voice")
    else:
        default = LANGUAGE_SPEAKERS.get(request.target_language, ["neutral"])[0]
        parts.append(f"{default}'s voice")
    parts.append(f"expressing {emotion} emotion")
    if request.style:
        parts.append(request.style)
    parts.append(f"speaking in {request.target_language}, clear and high quality")
    return ", ".join(parts)

@app.get("/")
async def root():
    global public_url_global
    response_data = {
        "message": "TTS API is running", 
        "endpoints": ["/options", "/tts", "/generate-storyboard", "/generate-illustration"]
    }
    
    if public_url_global:
        response_data["public_url"] = str(public_url_global)
        response_data["status"] = "Public access available"
    else:
        response_data["status"] = "Local access only"
        
    return response_data

@app.get("/ngrok-status")
async def ngrok_status():
    """Check ngrok tunnel status"""
    global public_url_global
    try:
        # Try to get current tunnels
        tunnels = ngrok.get_tunnels()
        return {
            "status": "active" if tunnels else "inactive",
            "tunnels": [str(tunnel.public_url) for tunnel in tunnels],
            "stored_url": str(public_url_global) if public_url_global else None
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "stored_url": str(public_url_global) if public_url_global else None
        }

@app.get("/tts/options")
async def tts_options():
    # Explicit JSONResponse to ensure content-type is application/json
    print("/tts/options requested")
    return JSONResponse(content={"languages": list(LANGUAGE_SPEAKERS.keys()), "speakers": LANGUAGE_SPEAKERS})

@app.options("/tts/options")
async def tts_options_options():
    # respond to preflight requests or tooling that calls OPTIONS
    return JSONResponse(content={"ok": True})

@app.post("/tts")
async def generate_tts(request: TTSRequest):
    try:
        # Check if models are loaded
        if not all([model, tokenizer, description_tokenizer]):
            raise HTTPException(status_code=503, detail="TTS models not loaded")
        
        # 1️⃣ Detect emotion using Groq
        emotion_prompt = f"Detect the primary emotion of this text in one word: '{request.text}'"
        groq_response = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": emotion_prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=10
        )
        emotion = groq_response.choices[0].message.content.strip().lower()
 
        # 2️⃣ Translate text if needed
        if request.target_language.lower() != "auto":
            translation_prompt = f"Translate this text to {request.target_language}: '{request.text}' no need to add any text other than translated text"
            translation_response = groq_client.chat.completions.create(
                messages=[{"role": "user", "content": translation_prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.3,
                max_tokens=200
            )
            text_to_speak = translation_response.choices[0].message.content.strip()
        else:
            text_to_speak = request.text
 
        # 3️⃣ Build description for TTS
        description_parts = []
        if request.speaker:
            description_parts.append(f"{request.speaker}'s voice")
        else:
            # Use default speaker based on language
            default_speakers = LANGUAGE_SPEAKERS.get(request.target_language, ["neutral"])
            description_parts.append(f"{default_speakers[0]}'s voice")
        
        description_parts.append(f"expressing {emotion} emotion")
        if request.style:
            description_parts.append(request.style)
        description_parts.append(f"speaking in {request.target_language}, clear and high quality")
 
        description_text = ", ".join(description_parts)
 
        # 4️⃣ Tokenize
        prompt_input_ids = tokenizer(text_to_speak, return_tensors="pt").to(device)
        description_input_ids = description_tokenizer(description_text, return_tensors="pt").to(device)
 
        # 5️⃣ Generate audio
        generation = model.generate(
            input_ids=description_input_ids.input_ids,
            attention_mask=description_input_ids.attention_mask,
            prompt_input_ids=prompt_input_ids.input_ids,
            prompt_attention_mask=prompt_input_ids.attention_mask,
            do_sample=True,
            temperature=0.7
        )
        audio_arr = generation.cpu().numpy().squeeze()
 
        # 6️⃣ Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmpfile:
            sf.write(tmpfile.name, audio_arr, model.config.sampling_rate)
            return FileResponse(
                tmpfile.name,
                media_type="audio/wav",
                filename=f"tts_{request.target_language}_{emotion}.wav",
                headers={"Content-Disposition": "attachment"}
            )
 
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")

storyboard_system_prompt = """You are a visual assistant specialized in Storyboard Generation for image generation models.

You are using the DreamShaper 8 model (lykon/dreamshaper-8), which excels at anime-inspired, fantasy, and semi-realistic illustrations with vibrant colors and cinematic quality. Avoid photorealism, modern realism, or harsh lighting. Focus on dreamlike, storybook, painterly, or fantasy-themed visuals. Do not include text or labels in images.

When the user provides a story prompt, follow these instructions:

1. Determine if it describes a story, journey, or process.

2. Split the story into 4 logical, visual scenes that progress meaningfully.

For each scene:
- Write a clear, standalone, image-friendly prompt.
- Always include the subject, setting, mood, and style in each prompt.
- Do NOT use pronouns like "he", "she", or "they".
- Use rich visual descriptors: lighting, color palette, atmosphere, motion, fantasy elements.
- Include keywords helpful for DreamShaper-8: "fantasy setting", "anime style", "dramatic lighting", "glowing particles", "high detail", "surreal background", etc.
- Keep prompts under 30 words where possible.
- Avoid narrative exposition — describe what should visually appear.

Output ONLY in this format:

{
  "category": "Storyboard Generation",
  "scenes": [
    "<precise image-ready prompt>",
    "<precise image-ready prompt>",
    "<precise image-ready prompt>",
    "<precise image-ready prompt>"
  ]
}

Do not explain anything. Do not include any text outside the JSON.
"""

@app.post("/generate-storyboard")
async def generate_storyboard(request: Request, prompt: str = Form(...)):
    try:
        # 1. Call LLM to split into scenes
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": storyboard_system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=1,
            max_tokens=1024,
            top_p=1,
            stream=False
        )

        try:
            result = json.loads(response.choices[0].message.content)
            scene_prompts = result.get("scenes", [])
        except Exception as e:
            return JSONResponse(content={"error": f"Failed to parse LLM output: {str(e)}"}, status_code=500)

        # 2. Generate one image per scene
        images = []
        for scene in scene_prompts:
            img = pipe(scene, height=512, width=512, guidance_scale=8.5, num_inference_steps=50).images[0]
            images.append(img)

        cols = 2
        padding = 10
        rows = 2
        bg_color = (255, 255, 255)
        
        # Get image size (assume all same size)
        img_width, img_height = images[0].size

        # Create canvas
        storyboard_width = cols * img_width + (cols + 1) * padding
        storyboard_height = rows * img_height + (rows + 1) * padding
        storyboard = Image.new("RGB", (storyboard_width, storyboard_height), bg_color)

        # Paste images
        for idx, img in enumerate(images):
            row = idx // cols
            col = idx % cols
            x = padding + col * (img_width + padding)
            y = padding + row * (img_height + padding)
            storyboard.paste(img, (x, y))

        # 4. Convert to base64
        buf = io.BytesIO()
        storyboard.save(buf, format="PNG")
        img_b64 = base64.b64encode(buf.getvalue()).decode()

        return JSONResponse(content={"storyboard": img_b64})
        
    except Exception as e:
        return JSONResponse(content={"error": f"Storyboard generation failed: {str(e)}"}, status_code=500)

@app.post("/generate-illustration")
async def generate_illustration(request: Request, prompt: str = Form(...)):
    try:
        image = pipe(prompt, height=512, width=512, guidance_scale=10, num_inference_steps=50).images[0]

        buf = io.BytesIO()
        image.save(buf, format="PNG")
        img_b64 = base64.b64encode(buf.getvalue()).decode()

        return JSONResponse(content={"illustration": img_b64})
        
    except Exception as e:
        return JSONResponse(content={"error": f"Illustration generation failed: {str(e)}"}, status_code=500)

# Check port availability
def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("localhost", port)) == 0

def cleanup_ngrok():
    """Cleanup function to kill ngrok processes"""
    try:
        ngrok.kill()
        print("Ngrok processes cleaned up")
    except Exception as e:
        print(f"Error cleaning up ngrok: {e}")

# Register cleanup function
atexit.register(cleanup_ngrok)

# Signal handlers for graceful shutdown
def signal_handler(signum, frame):
    print(f"Received signal {signum}, shutting down...")
    cleanup_ngrok()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def start_ngrok_tunnel(port):
    """Start ngrok tunnel and return the public URL"""
    global public_url_global
    
    try:
        # Kill any existing ngrok processes first
        try:
            ngrok.kill()
            print("🔄 Killed existing ngrok processes")
        except Exception:
            pass  # No existing processes to kill

        # Set ngrok auth token
        ngrok.set_auth_token("30MAhiisD1xn5S97n4vflKuRSYc_7r2Fp4bzgtaUNW6Ui6kQx")
        
        # Start ngrok tunnel
        public_url = ngrok.connect(port)
        public_url_global = public_url  # Store globally
        
        print("🔄 Ngrok tunnel established!")
        print(f"🌐 Public URL: {public_url}")
        
        return public_url
        
    except Exception as e:
        print(f"❌ Ngrok failed to start: {e}")
        print("🔄 Server will run in local-only mode")
        public_url_global = None
        return None

def start_server():
    port = 8081
    
    # Check if port is in use
    if is_port_in_use(port):
        print(f"⚠️ Port {port} is already in use!")
        print("💡 Try killing the existing process:")
        print(f"   lsof -ti:{port} | xargs kill -9")
        sys.exit(1)

    # Start ngrok tunnel first
    public_url = start_ngrok_tunnel(port)
    
    try:
        # Run the FastAPI app
        print("🔄 Starting FastAPI server...")
        uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
        
    except Exception as e:
        print(f"❌ Error starting FastAPI server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_server()