from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import json
import logging
from datetime import datetime
import uuid
from werkzeug.utils import secure_filename
import threading
from typing import Dict, Any

# Import our text-to-video system
from text_to_video_system import (
    TextToVideoGenerator, VideoConfig, Tone, Domain, Environment,
    VideoGenerationAPI
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['OUTPUT_FOLDER'] = 'outputs'

# Create necessary directories
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)

# Initialize video generation system
video_api = VideoGenerationAPI()

# Store for tracking generation jobs
generation_jobs = {}

class GenerationJob:
    """Class to track video generation jobs"""
    def __init__(self, job_id: str, text: str, config: VideoConfig):
        self.job_id = job_id
        self.text = text
        self.config = config
        self.status = "queued"
        self.created_at = datetime.now()
        self.completed_at = None
        self.video_path = None
        self.metrics = None
        self.error_message = None

def generate_video_async(job: GenerationJob):
    """Asynchronously generate video"""
    try:
        job.status = "processing"
        logger.info(f"Starting generation for job {job.job_id}")
        
        video_path, metrics = video_api.generator.generate_video(job.text, job.config)
        
        # Move video to output folder
        final_path = os.path.join(app.config['OUTPUT_FOLDER'], f"{job.job_id}.mp4")
        os.rename(video_path, final_path)
        
        job.video_path = final_path
        job.metrics = metrics
        job.status = "completed"
        job.completed_at = datetime.now()
        
        logger.info(f"Job {job.job_id} completed successfully")
        
    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)
        job.completed_at = datetime.now()
        logger.error(f"Job {job.job_id} failed: {e}")

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    })

@app.route('/api/generate-video', methods=['POST'])
def generate_video():
    """Generate video from text with specified parameters"""
    try:
        data = request.get_json()
        logger.info(f"Received request to generate video with data: {data}")
        # Validate required fields
        if not data or 'text' not in data:
            return jsonify({'error': 'Text is required'}), 400
        
        if len(data['text'].strip()) == 0:
            return jsonify({'error': 'Text cannot be empty'}), 400
        
        # Parse configuration
        try:
            config = VideoConfig(
                tone=Tone(data.get('tone', 'formal')),
                domain=Domain(data.get('domain', 'education')),
                environment=Environment(data.get('environment', 'studio')),
                duration=int(data.get('duration', 30)),
                fps=int(data.get('fps', 24)),
                resolution=tuple(data.get('resolution', [1920, 1080])),
                language=data.get('language', 'en'),
                include_subtitles=bool(data.get('include_subtitles', True)),
                include_background_music=bool(data.get('include_background_music', False)),
                avatar_narration=bool(data.get('avatar_narration', False))
            )
        except ValueError as e:
            return jsonify({'error': f'Invalid configuration parameter: {e}'}), 400
        
        # Generate unique job ID
        job_id = str(uuid.uuid4())
        
        # Create job
        job = GenerationJob(job_id, data['text'], config)
        generation_jobs[job_id] = job
        
        # Start generation in background thread
        thread = threading.Thread(target=generate_video_async, args=(job,))
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'job_id': job_id,
            'status': 'queued',
            'message': 'Video generation started',
            'estimated_time': f"{config.duration + 60} seconds"
        })
        
    except Exception as e:
        logger.error(f"Error in generate_video endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/job-status/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """Get status of a video generation job"""
    if job_id not in generation_jobs:
        return jsonify({'error': 'Job not found'}), 404
    
    job = generation_jobs[job_id]
    
    response = {
        'job_id': job.job_id,
        'status': job.status,
        'created_at': job.created_at.isoformat(),
        'text_preview': job.text[:100] + "..." if len(job.text) > 100 else job.text
    }
    
    if job.completed_at:
        response['completed_at'] = job.completed_at.isoformat()
        response['processing_time'] = (job.completed_at - job.created_at).total_seconds()
    
    if job.status == 'completed' and job.metrics:
        response['metrics'] = {
            'inference_time': job.metrics.inference_time,
            'memory_usage': job.metrics.memory_usage,
            'gpu_usage': job.metrics.gpu_usage,
            'frame_rate': job.metrics.frame_rate,
            'scene_fidelity_score': job.metrics.scene_fidelity_score,
            'generation_cost': job.metrics.generation_cost
        }
        response['download_url'] = f"/api/download-video/{job_id}"
    
    if job.status == 'failed':
        response['error_message'] = job.error_message
    
    return jsonify(response)

@app.route('/api/download-video/<job_id>', methods=['GET'])
def download_video(job_id):
    """Download generated video"""
    if job_id not in generation_jobs:
        return jsonify({'error': 'Job not found'}), 404
    
    job = generation_jobs[job_id]
    
    if job.status != 'completed':
        return jsonify({'error': 'Video not ready'}), 400
    
    if not job.video_path or not os.path.exists(job.video_path):
        return jsonify({'error': 'Video file not found'}), 404
    
    return send_file(
        job.video_path,
        as_attachment=True,
        download_name=f"generated_video_{job_id}.mp4",
        mimetype='video/mp4'
    )

@app.route('/api/available-options', methods=['GET'])
def get_available_options():
    """Get available configuration options"""
    return jsonify({
        'tones': [tone.value for tone in Tone],
        'domains': [domain.value for domain in Domain],
        'environments': [env.value for env in Environment],
        'languages': ['en', 'hi', 'es', 'fr', 'de'],  # Can be extended
        'resolutions': [
            [1920, 1080],  # Full HD
            [1280, 720],   # HD
            [854, 480],    # SD
            [640, 360]     # Mobile
        ],
        'fps_options': [24, 25, 30, 60]
    })

@app.route('/api/jobs', methods=['GET'])
def list_jobs():
    """List all generation jobs"""
    jobs_list = []
    for job_id, job in generation_jobs.items():
        jobs_list.append({
            'job_id': job_id,
            'status': job.status,
            'created_at': job.created_at.isoformat(),
            'text_preview': job.text[:50] + "..." if len(job.text) > 50 else job.text,
            'config': {
                'tone': job.config.tone.value,
                'domain': job.config.domain.value,
                'environment': job.config.environment.value,
                'duration': job.config.duration
            }
        })
    
    # Sort by creation time (newest first)
    jobs_list.sort(key=lambda x: x['created_at'], reverse=True)
    
    return jsonify({
        'jobs': jobs_list,
        'total_jobs': len(jobs_list)
    })

@app.route('/api/job/<job_id>', methods=['DELETE'])
def delete_job(job_id):
    """Delete a job and its associated files"""
    if job_id not in generation_jobs:
        return jsonify({'error': 'Job not found'}), 404
    
    job = generation_jobs[job_id]
    
    # Delete video file if it exists
    if job.video_path and os.path.exists(job.video_path):
        try:
            os.remove(job.video_path)
        except Exception as e:
            logger.warning(f"Could not delete video file for job {job_id}: {e}")
    
    # Remove job from memory
    del generation_jobs[job_id]
    
    return jsonify({'message': 'Job deleted successfully'})

@app.route('/api/demo', methods=['POST'])
def demo_generation():
    """Demo endpoint with predefined examples"""
    demo_examples = {
        'pib_release': {
            'text': """The Government of India announces the launch of a new digital literacy program 
                      aimed at empowering rural communities with technology skills. This initiative will 
                      provide free internet access and digital training to over 10,000 villages across 
                      the country, ensuring no citizen is left behind in the digital revolution.""",
            'config': {
                'tone': 'formal',
                'domain': 'governance',
                'environment': 'rural',
                'duration': 25,
                'include_subtitles': True
            }
        },
        'health_awareness': {
            'text': """Regular exercise and a balanced diet are essential for maintaining good health. 
                      Walking for 30 minutes daily, eating plenty of fruits and vegetables, and staying 
                      hydrated can significantly improve your overall well-being and prevent many diseases.""",
            'config': {
                'tone': 'informative',
                'domain': 'health',
                'environment': 'nature',
                'duration': 20,
                'include_subtitles': True
            }
        },
        'education_content': {
            'text': """Climate change is one of the most pressing challenges of our time. Rising global 
                      temperatures, melting ice caps, and extreme weather events are clear indicators 
                      that immediate action is needed to protect our planet for future generations.""",
            'config': {
                'tone': 'documentary',
                'domain': 'education',
                'environment': 'nature',
                'duration': 30,
                'include_subtitles': True
            }
        }
    }
    
    try:
        data = request.get_json()
        example_type = data.get('example_type', 'pib_release')
        
        if example_type not in demo_examples:
            return jsonify({'error': 'Invalid example type'}), 400
        
        example = demo_examples[example_type]
        
        # Generate unique job ID
        job_id = str(uuid.uuid4())
        
        # Create configuration
        config = VideoConfig(
            tone=Tone(example['config']['tone']),
            domain=Domain(example['config']['domain']),
            environment=Environment(example['config']['environment']),
            duration=example['config']['duration'],
            include_subtitles=example['config']['include_subtitles']
        )
        
        # Create job
        job = GenerationJob(job_id, example['text'], config)
        generation_jobs[job_id] = job
        
        # Start generation
        thread = threading.Thread(target=generate_video_async, args=(job,))
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'job_id': job_id,
            'status': 'queued',
            'example_type': example_type,
            'message': f'Demo video generation started for {example_type}',
            'text_preview': example['text'][:100] + "..."
        })
        
    except Exception as e:
        logger.error(f"Error in demo endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/metrics', methods=['GET'])
def get_system_metrics():
    """Get system performance metrics"""
    import psutil
    import torch
    
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    metrics = {
        'system': {
            'cpu_usage': cpu_percent,
            'memory_usage': memory.percent,
            'memory_available_gb': round(memory.available / (1024**3), 2),
            'disk_usage': disk.percent,
            'disk_free_gb': round(disk.free / (1024**3), 2)
        },
        'jobs': {
            'total_jobs': len(generation_jobs),
            'queued_jobs': len([j for j in generation_jobs.values() if j.status == 'queued']),
            'processing_jobs': len([j for j in generation_jobs.values() if j.status == 'processing']),
            'completed_jobs': len([j for j in generation_jobs.values() if j.status == 'completed']),
            'failed_jobs': len([j for j in generation_jobs.values() if j.status == 'failed'])
        }
    }
    
    # Add GPU metrics if available
    if torch.cuda.is_available():
        metrics['gpu'] = {
            'gpu_available': True,
            'gpu_count': torch.cuda.device_count(),
            'gpu_memory_allocated': torch.cuda.memory_allocated() / (1024**3),
            'gpu_memory_reserved': torch.cuda.memory_reserved() / (1024**3)
        }
    else:
        metrics['gpu'] = {'gpu_available': False}
    
    return jsonify(metrics)

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(413)
def too_large(error):
    return jsonify({'error': 'File too large'}), 413

if __name__ == '__main__':
    # Development server
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)

# Production WSGI configuration
def create_app():
    """Factory function for production deployment"""
    return app