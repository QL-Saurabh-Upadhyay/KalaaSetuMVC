import nest_asyncio
import os
from pyngrok import ngrok
from infograph_router import router as infograph_router
from fastapi import FastAPI, Request, Form
from groq import Groq
from PIL import Image
import io, json, base64
import torch
from diffusers import AutoPipelineForText2Image, DEISMultistepScheduler
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from fastapi.responses import JSONResponse

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

# Mount infographics router
app.include_router(infograph_router, prefix="/infograph")



# Groq Client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))


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
- Include keywords helpful for DreamShaper-8: “fantasy setting”, “anime style”, “dramatic lighting”, “glowing particles”, “high detail”, “surreal background”, etc.
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
    # 1. Call LLM to split into scenes
    response = client.chat.completions.create(
        model="llama3-70b-8192",
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

    cols =2
    padding =10
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


@app.post("/generate-illustration")
async def generate_illustration(request: Request, prompt: str = Form(...)):
    image = pipe(prompt, height=512, width=512, guidance_scale=10, num_inference_steps=50).images[0]

    buf = io.BytesIO()
    image.save(buf, format="PNG")
    img_b64 = base64.b64encode(buf.getvalue()).decode()

    return JSONResponse(content={"illustration": img_b64})

# Add your token below
ngrok.set_auth_token("30MAhiisD1xn5S97n4vflKuRSYc_7r2Fp4bzgtaUNW6Ui6kQx")

#Allow CORS if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Start ngrok tunnel
public_url = ngrok.connect(8081)
print(f"Open this in your browser: {public_url}")

# Run the FastAPI app
uvicorn.run(app, host="0.0.0.0", port=8081)