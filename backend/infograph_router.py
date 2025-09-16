import os
import io
import time
import uuid
import base64
import threading
import atexit
import pandas as pd
import psutil
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi import Depends
from fastapi import BackgroundTasks
from fastapi import Body
from pyngrok import ngrok
from diffusers import StableDiffusionPipeline
import torch
from PIL import Image, ImageDraw, ImageFont
from googletrans import Translator
from transformers import CLIPProcessor, CLIPModel
from werkzeug.utils import secure_filename

# --- Setup ---
os.makedirs('uploads', exist_ok=True)
os.makedirs('outputs', exist_ok=True)

router = APIRouter()

# --- Initialize Models ---
try:
    sd_device = "cuda" if torch.cuda.is_available() else "cpu"
    pipe = StableDiffusionPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5", torch_dtype=torch.float16
    ).to(sd_device)
    clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
    clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    models_loaded = True
except Exception as e:
    print(f"Model loading error: {e}")
    pipe = None
    clip_model = None
    clip_processor = None
    models_loaded = False

translator = Translator()

# --- Helper Functions ---
def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() == 'csv'

def pil_image_to_base64(image: Image.Image) -> str | None:
    try:
        buffer = io.BytesIO()
        if image.mode != 'RGB':
            image = image.convert('RGB')
        image.save(buffer, format='PNG')
        buffer.seek(0)
        img_bytes = buffer.getvalue()
        img_base64 = base64.b64encode(img_bytes).decode('utf-8')
        return f"data:image/png;base64,{img_base64}"
    except Exception as e:
        print(f"PIL to Base64 conversion error: {e}")
        return None

def image_file_to_base64(image_path: str) -> str | None:
    try:
        with open(image_path, 'rb') as image_file:
            img_bytes = image_file.read()
            img_base64 = base64.b64encode(img_bytes).decode('utf-8')
            return f"data:image/png;base64,{img_base64}"
    except Exception as e:
        print(f"File to Base64 conversion error: {e}")
        return None

def detect_column_types(df: pd.DataFrame):
    numeric_cols = []
    categorical_cols = []
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            numeric_cols.append(col)
        else:
            categorical_cols.append(col)
    return numeric_cols, categorical_cols

def generate_chart_config(data, chart_type, x_col, y_col, color_scheme, limit=10):
    limited_data = data[:limit]
    labels = [str(row[x_col]) for row in limited_data]
    values = []
    for row in limited_data:
        try:
            values.append(float(row[y_col]))
        except:
            values.append(0)
    color_map = {
        "blue-green": {"bg": "rgba(0, 128, 128, 0.7)", "border": "rgba(0, 128, 128, 1)"},
        "blue": {"bg": "rgba(0, 100, 255, 0.7)", "border": "rgba(0, 100, 255, 1)"},
        "neutral": {"bg": "rgba(100, 100, 100, 0.7)", "border": "rgba(100, 100, 100, 1)"}
    }
    colors = color_map.get(color_scheme, color_map["blue"])
    return {
        'type': chart_type,
        'data': {
            'labels': labels,
            'datasets': [{
                'label': f'{y_col} by {x_col}',
                'data': values,
                'backgroundColor': colors["bg"],
                'borderColor': colors["border"],
                'borderWidth': 2
            }]
        },
        'options': {
            'responsive': True,
            'scales': {
                'y': {'beginAtZero': True}
            } if chart_type in ['bar', 'line'] else {}
        }
    }

def create_chart_image(data, chart_type, x_col, y_col, title, color_scheme, limit=10):
    try:
        limited_data = data[:limit]
        labels = [str(row[x_col]) for row in limited_data]
        values = []
        for row in limited_data:
            try:
                values.append(float(row[y_col]))
            except:
                values.append(0)
        colors = ['#0066FF' for _ in values]
        fig, ax = plt.subplots(figsize=(6,4))
        if chart_type == 'bar':
            ax.bar(labels, values, color=colors)
        elif chart_type == 'line':
            ax.plot(labels, values, marker='o', color=colors[0])
        elif chart_type == 'pie':
            ax.pie(values, labels=labels, autopct='%1.1f%%')
        ax.set_title(title)
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        buf = io.BytesIO()
        fig.savefig(buf, format='PNG')
        plt.close(fig)
        buf.seek(0)
        img_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
        return f"data:image/png;base64,{img_b64}"
    except Exception as e:
        print(f"Chart creation error: {e}")
        return None

def generate_infographic_prompt(data, x_col, y_col, title, tone, color_scheme, custom_prompt=None):
    if custom_prompt:
        return custom_prompt
    data_summary = f"data about {x_col} and {y_col}"
    if len(data) > 0:
        sample_values = [str(row[x_col]) for row in data[:3]]
        data_summary = f"data showing {x_col} categories: {', '.join(sample_values)}"
    tone_styles = {
        "formal": "professional, clean, corporate style",
        "casual": "friendly, approachable, modern style",
        "promotional": "eye-catching, vibrant, marketing style"
    }
    color_prompts = {
        "blue-green": "blue and teal color scheme, ocean-inspired colors",
        "blue": "blue color palette, professional blue tones",
        "neutral": "neutral colors, grayscale with subtle accents"
    }
    style = tone_styles.get(tone, "clean, professional style")
    colors = color_prompts.get(color_scheme, "blue color scheme")
    prompt = f"Modern infographic design, {style}, {colors}, data visualization, charts and graphs, {data_summary}, clean layout, white background, professional typography, high quality, detailed"
    return prompt

def create_infographic_overlay(base_image: Image.Image, data, x_col, y_col, title, tone, color_scheme, language):
    try:
        image = base_image.convert('RGBA')
        draw = ImageDraw.Draw(image)
        try:
            font = ImageFont.truetype('arial.ttf', 20)
            title_font = ImageFont.truetype('arial.ttf', 24)
        except:
            font = ImageFont.load_default()
            title_font = ImageFont.load_default()
        color_map = {
            "blue-green": (0, 128, 128),
            "blue": (0, 0, 255),
            "neutral": (100, 100, 100)
        }
        text_color = color_map.get(color_scheme, (0, 0, 255))
        draw.text((50, 30), title, font=title_font, fill=text_color)
        y_offset = 80
        for i, row in enumerate(data[:5]):
            text = f"{row[x_col]}: {row[y_col]}"
            draw.text((50, y_offset), text, font=font, fill=text_color)
            y_offset += 35
        return image
    except Exception as e:
        print(f"Overlay error: {e}")
        return None

# --- Router Endpoints ---
@router.get('/health')
def health_check():
    return JSONResponse({'status': 'healthy', 'models_loaded': models_loaded, 'timestamp': time.time()})


@router.post('/upload')
async def upload_csv(file: UploadFile = File(...)):
    if not allowed_file(file.filename):
        raise HTTPException(status_code=400, detail='Invalid file type. Only CSV allowed')
    filename = secure_filename(file.filename)
    filepath = os.path.join('uploads', filename)
    with open(filepath, 'wb') as f:
        contents = await file.read()
        f.write(contents)
    df = pd.read_csv(filepath)
    numeric_cols, categorical_cols = detect_column_types(df)
    sample_data = df.head(5).to_dict(orient='records')
    return JSONResponse({'success': True, 'filename': filename, 'columns': df.columns.tolist(), 'numeric_columns': numeric_cols, 'categorical_columns': categorical_cols, 'row_count': len(df), 'sample_data': sample_data})


@router.post('/chart-options')
async def get_chart_options(payload: dict = Body(...)):
    filename = payload.get('filename')
    if not filename:
        raise HTTPException(status_code=400, detail='Filename required')
    filepath = os.path.join('uploads', filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=400, detail=f'Uploaded file not found: {filename}')
    try:
        df = pd.read_csv(filepath)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Failed to read CSV: {e}')
    numeric_cols, categorical_cols = detect_column_types(df)
    x_default = categorical_cols[0] if categorical_cols else df.columns[0]
    y_default = numeric_cols[0] if numeric_cols else (df.columns[1] if len(df.columns) > 1 else df.columns[0])
    options = {
        'chart_types': [
            {'value': 'bar', 'label': 'Bar Chart'},
            {'value': 'line', 'label': 'Line Chart'},
            {'value': 'pie', 'label': 'Pie Chart'},
            {'value': 'infographic', 'label': 'AI Infographic'}
        ],
        'columns': df.columns.tolist(),
        'tones': [
            {'value': 'formal', 'label': 'Formal'},
            {'value': 'casual', 'label': 'Casual'},
            {'value': 'promotional', 'label': 'Promotional'}
        ],
        'color_schemes': [
            {'value': 'blue-green', 'label': 'Blue Green'},
            {'value': 'blue', 'label': 'Blue'},
            {'value': 'neutral', 'label': 'Neutral'}
        ],
        'languages': [
            {'value': 'en', 'label': 'English'},
            {'value': 'hi', 'label': 'Hindi'}
        ],
        'defaults': {
            'chart_type': 'bar',
            'x_axis': x_default,
            'y_axis': y_default,
            'tone': 'formal',
            'color_scheme': 'blue-green',
            'language': 'en'
        }
    }
    return JSONResponse({'success': True, 'options': options})


@router.post('/generate')
async def generate_visualization(payload: dict = Body(...)):
    filename = payload.get('filename')
    params = payload.get('parameters', {})
    if not filename:
        raise HTTPException(status_code=400, detail='Filename required')
    filepath = os.path.join('uploads', filename)
    df = pd.read_csv(filepath)
    data_records = df.to_dict(orient='records')
    chart_type = params.get('chart_type', 'bar')
    x_col = params.get('x_axis')
    y_col = params.get('y_axis')
    if x_col is None or y_col is None:
        raise HTTPException(status_code=400, detail='x_axis and y_axis parameters are required')
    tone = params.get('tone', 'formal')
    color_scheme = params.get('color_scheme', 'blue-green')
    language = params.get('language', 'en')
    title = params.get('title', f'{y_col} by {x_col}')
    start_time = time.time()
    result = {'success': True}
    if chart_type == 'infographic' and models_loaded:
        custom_prompt = params.get('custom_prompt')
        prompt = generate_infographic_prompt(data_records, x_col, y_col, title, tone, color_scheme, custom_prompt)
        base_image = pipe(
            prompt,
            num_inference_steps=params.get('inference_steps', 25),
            guidance_scale=params.get('guidance_scale', 7.5),
            width=params.get('width', 512),
            height=params.get('height', 512)
        ).images[0]
        final_image = create_infographic_overlay(base_image, data_records, x_col, y_col, title, tone, color_scheme, language)
        if final_image:
            base64_image = pil_image_to_base64(final_image)
            if base64_image:
                result['infographic'] = {'base64': base64_image, 'prompt_used': prompt, 'format': 'PNG', 'dimensions': f"{final_image.width}x{final_image.height}"}
            else:
                raise HTTPException(status_code=500, detail='Failed to convert infographic to base64')
        else:
            raise HTTPException(status_code=500, detail='Failed to generate infographic')
    else:
        chart_config = generate_chart_config(data_records, chart_type, x_col, y_col, color_scheme)
        # Also generate a PNG image for the chart and embed as base64 inside chart_config
        try:
            chart_b64 = create_chart_image(data_records, chart_type, x_col, y_col, title, color_scheme)
            if chart_b64:
                chart_config['image_base64'] = chart_b64
        except Exception as e:
            # non-fatal: attach warning inside chart_config
            chart_config.setdefault('warnings', []).append(f'chart_image_error: {e}')

        result['chart_config'] = chart_config
    result['metrics'] = {'generation_time': round(time.time() - start_time, 2), 'cpu_usage': psutil.cpu_percent(), 'memory_usage': psutil.virtual_memory().percent}
    return JSONResponse(result)


@router.post('/generate-base64-only')
async def generate_base64_only(payload: dict = Body(...)):
    filename = payload.get('filename')
    params = payload.get('parameters', {})
    if not filename:
        raise HTTPException(status_code=400, detail='Filename required')
    filepath = os.path.join('uploads', filename)
    df = pd.read_csv(filepath)
    data_records = df.to_dict(orient='records')
    chart_type = params.get('chart_type', 'infographic')
    x_col = params.get('x_axis')
    y_col = params.get('y_axis')
    tone = params.get('tone', 'formal')
    color_scheme = params.get('color_scheme', 'blue-green')
    title = params.get('title', f'{y_col} by {x_col}')
    start_time = time.time()
    if chart_type == 'infographic' and models_loaded:
        custom_prompt = params.get('custom_prompt')
        prompt = generate_infographic_prompt(data_records, x_col, y_col, title, tone, color_scheme, custom_prompt)
        base_image = pipe(
            prompt,
            num_inference_steps=params.get('inference_steps', 25),
            guidance_scale=params.get('guidance_scale', 7.5),
            width=params.get('width', 512),
            height=params.get('height', 512)
        ).images[0]
        final_image = create_infographic_overlay(base_image, data_records, x_col, y_col, title, tone, color_scheme, 'en')
        if final_image:
            base64_image = pil_image_to_base64(final_image)
            if base64_image:
                return JSONResponse({'success': True, 'image_base64': base64_image, 'prompt_used': prompt, 'format': 'PNG', 'dimensions': f"{final_image.width}x{final_image.height}", 'metrics': {'generation_time': round(time.time() - start_time, 2), 'cpu_usage': psutil.cpu_percent(), 'memory_usage': psutil.virtual_memory().percent}})
            else:
                raise HTTPException(status_code=500, detail='Failed to convert image to base64')
        else:
            raise HTTPException(status_code=500, detail='Failed to generate infographic')
    else:
        raise HTTPException(status_code=400, detail='Infographic generation not available')


@router.post('/convert-to-base64')
async def convert_existing_to_base64(payload: dict = Body(...)):
    filename = payload.get('filename')
    if not filename:
        raise HTTPException(status_code=400, detail='Filename required')
    filepath = os.path.join('outputs', filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail='File not found')
    base64_image = image_file_to_base64(filepath)
    if base64_image:
        return JSONResponse({'success': True, 'image_base64': base64_image, 'format': 'PNG'})
    else:
        raise HTTPException(status_code=500, detail='Failed to convert image to base64')


@router.get('/outputs/{filename}')
def serve_output(filename: str):
    filepath = os.path.join('outputs', filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail='File not found')
    return FileResponse(filepath)


@router.get('/data/{filename}')
def get_data_preview(filename: str):
    filepath = os.path.join('uploads', filename)
    df = pd.read_csv(filepath)
    stats = {'shape': df.shape, 'columns': df.columns.tolist(), 'dtypes': df.dtypes.to_dict(), 'null_counts': df.isnull().sum().to_dict(), 'sample_data': df.head(10).to_dict(orient='records')}
    numeric_cols = df.select_dtypes(include=['number']).columns
    if len(numeric_cols) > 0:
        stats['numeric_stats'] = df[numeric_cols].describe().to_dict()
    return JSONResponse({'success': True, 'stats': stats})


@router.post('/prompt-suggestions')
def get_prompt_suggestions(payload: dict = Body(...)):
    x_col = payload.get('x_axis')
    y_col = payload.get('y_axis')
    tone = payload.get('tone', 'formal')
    color_scheme = payload.get('color_scheme', 'blue')
    data_type = payload.get('data_type', 'general')
    suggestions = []
    base_prompts = {
        'sales': f"Professional sales infographic showing {x_col} vs {y_col}, corporate style, charts and graphs",
        'marketing': f"Eye-catching marketing infographic, {x_col} and {y_col} data, vibrant design, call-to-action elements",
        'analytics': f"Clean analytics dashboard style, {x_col} by {y_col}, data visualization, KPI layout",
        'financial': f"Financial report infographic, {x_col} and {y_col} metrics, professional charts, business style",
        'general': f"Modern data infographic showing {x_col} vs {y_col}, clean layout, professional design"
    }
    for data_cat, base in base_prompts.items():
        prompt = generate_infographic_prompt([], x_col, y_col, f"{x_col} Analysis", tone, color_scheme)
        suggestions.append({'category': data_cat, 'prompt': prompt, 'description': f"{data_cat.title()} style infographic"})
    return JSONResponse({
        'success': True,
        'suggestions': suggestions,
        'custom_parameters': {
            'inference_steps': {'min': 10, 'max': 50, 'default': 25},
            'guidance_scale': {'min': 1, 'max': 20, 'default': 7.5},
            'width': {'options': [512, 768, 1024], 'default': 512},
            'height': {'options': [512, 768, 1024], 'default': 512}
        }
    })


# --- Ngrok Configuration ---
NGROK_AUTH_TOKEN = os.getenv('NGROK_AUTH_TOKEN', '')
ngrok_tunnel = None

def setup_ngrok():
    global ngrok_tunnel
    try:
        if NGROK_AUTH_TOKEN:
            ngrok.set_auth_token(NGROK_AUTH_TOKEN)
        ngrok_tunnel = ngrok.connect(5000)
        return ngrok_tunnel.public_url
    except Exception as e:
        print(f"Ngrok setup failed: {e}")
        return None

def cleanup_ngrok():
    global ngrok_tunnel
    try:
        if ngrok_tunnel:
            ngrok.disconnect(ngrok_tunnel.public_url)
        ngrok.kill()
    except:
        pass

atexit.register(cleanup_ngrok)
