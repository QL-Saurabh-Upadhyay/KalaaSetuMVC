import os
import json
import time
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import torch
import cv2
import numpy as np
from PIL import Image
import moviepy as mp
from transformers import pipeline, AutoTokenizer, AutoModel
import whisper
from TTS.api import TTS
from diffusers import DiffusionPipeline

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Tone(Enum):
    FORMAL = "formal"
    CASUAL = "casual"
    EMOTIONAL = "emotional"
    DOCUMENTARY = "documentary"
    INFORMATIVE = "informative"
    PERSUASIVE = "persuasive"

class Domain(Enum):
    EDUCATION = "education"
    HEALTH = "health"
    GOVERNANCE = "governance"
    ENTERTAINMENT = "entertainment"
    NEWS = "news"
    CORPORATE = "corporate"

class Environment(Enum):
    RURAL = "rural"
    URBAN = "urban"
    FUTURISTIC = "futuristic"
    NATURE = "nature"
    INDOORS = "indoors"
    STUDIO = "studio"
    CLASSROOM = "classroom"

@dataclass
class VideoConfig:
    tone: Tone
    domain: Domain
    environment: Environment
    duration: int = 30  # seconds
    fps: int = 24
    resolution: Tuple[int, int] = (1920, 1080)
    language: str = "en"
    include_subtitles: bool = True
    include_background_music: bool = True
    avatar_narration: bool = False

@dataclass
class VideoMetrics:
    inference_time: float
    memory_usage: float
    gpu_usage: float
    frame_rate: float
    scene_fidelity_score: float
    generation_cost: float

class TextProcessor:
    """Processes and segments text for video generation"""
    
    def __init__(self):
        self.tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
        
    def segment_text(self, text: str, max_segment_length: int = 100) -> List[str]:
        """Segment text into smaller chunks for scene generation"""
        sentences = text.split('. ')
        segments = []
        current_segment = ""
        
        for sentence in sentences:
            if len(current_segment + sentence) < max_segment_length:
                current_segment += sentence + ". "
            else:
                if current_segment:
                    segments.append(current_segment.strip())
                current_segment = sentence + ". "
        
        if current_segment:
            segments.append(current_segment.strip())
            
        return segments
    
    def extract_key_concepts(self, text: str) -> List[str]:
        """Extract key concepts for visual generation"""
        # Simple keyword extraction - can be enhanced with NER
        import re
        words = re.findall(r'\b[A-Za-z]{4,}\b', text)
        return list(set(words))

class AudioGenerator:
    """Generates audio narration from text"""
    
    def __init__(self):
        self.tts = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC", 
                      progress_bar=False, gpu=torch.cuda.is_available())
    
    def generate_narration(self, text: str, config: VideoConfig) -> str:
        """Generate audio narration"""
        output_path = f"temp_audio_{int(time.time())}.wav"
        
        # Adjust voice parameters based on tone and domain
        voice_params = self._get_voice_parameters(config.tone, config.domain)
        
        self.tts.tts_to_file(
            text=text,
            file_path=output_path,
            **voice_params
        )
        
        return output_path
    
    def _get_voice_parameters(self, tone: Tone, domain: Domain) -> Dict:
        """Get voice parameters based on tone and domain"""
        base_params = {"speaker_wav": None, "language": "en"}
        
        if tone == Tone.FORMAL:
            base_params.update({"speed": 0.9, "emotion": "neutral"})
        elif tone == Tone.CASUAL:
            base_params.update({"speed": 1.1, "emotion": "friendly"})
        elif tone == Tone.EMOTIONAL:
            base_params.update({"speed": 0.8, "emotion": "empathetic"})
        elif tone == Tone.DOCUMENTARY:
            base_params.update({"speed": 0.95, "emotion": "authoritative"})
            
        return base_params

class VisualGenerator:
    """Generates visual content for video"""
    
    def __init__(self):
        # Initialize text-to-image pipeline
        try:
            self.image_generator = DiffusionPipeline.from_pretrained(
            "rupeshs/LCM-runwayml-stable-diffusion-v1-5",
            low_cpu_mem_usage=True if 'accelerate' in globals() else False
            )
        except Exception as e:
            logger.error(f"Failed to load diffusion pipeline: {e}")
            raise

    def generate_scene_images(self, text_segments: List[str], config: VideoConfig) -> List[str]:
        """Generate images for each text segment"""
        image_paths = []
        
        for i, segment in enumerate(text_segments):
            prompt = self._create_visual_prompt(segment, config)
            
            try:
                image = self.image_generator(
                    prompt,
                    num_inference_steps=20,
                    height=config.resolution[1],
                    width=config.resolution[0]
                ).images[0]
                
                image_path = f"temp_scene_{i}_{int(time.time())}.png"
                image.save(image_path)
                image_paths.append(image_path)
                
            except Exception as e:
                logger.error(f"Error generating image for segment {i}: {e}")
                # Create a fallback solid color image
                fallback_path = self._create_fallback_image(config.resolution)
                image_paths.append(fallback_path)
        
        return image_paths
    
    def _create_visual_prompt(self, text: str, config: VideoConfig) -> str:
        """Create optimized prompt for image generation"""
        base_prompt = text
        
        # Add environment context
        environment_modifiers = {
            Environment.RURAL: "rural setting, countryside, natural landscape",
            Environment.URBAN: "urban environment, city, modern buildings",
            Environment.FUTURISTIC: "futuristic, sci-fi, high-tech environment",
            Environment.NATURE: "natural environment, outdoor, scenic",
            Environment.INDOORS: "indoor setting, interior space",
            Environment.STUDIO: "professional studio, clean background",
            Environment.CLASSROOM: "classroom, educational environment"
        }
        
        # Add domain-specific styling
        domain_styles = {
            Domain.EDUCATION: "educational, informative, clean design",
            Domain.HEALTH: "medical, healthcare, professional",
            Domain.GOVERNANCE: "official, governmental, formal",
            Domain.ENTERTAINMENT: "colorful, engaging, dynamic",
            Domain.NEWS: "news broadcast, professional, serious",
            Domain.CORPORATE: "business, professional, corporate"
        }
        
        # Add tone-based styling
        tone_styles = {
            Tone.FORMAL: "professional, formal composition",
            Tone.CASUAL: "relaxed, friendly atmosphere",
            Tone.EMOTIONAL: "emotional, expressive",
            Tone.DOCUMENTARY: "documentary style, realistic"
        }
        
        enhanced_prompt = f"{base_prompt}, {environment_modifiers[config.environment]}, {domain_styles[config.domain]}, {tone_styles[config.tone]}, high quality, detailed"
        
        return enhanced_prompt
    
    def _create_fallback_image(self, resolution: Tuple[int, int]) -> str:
        """Create a fallback image when generation fails"""
        img = Image.new('RGB', resolution, color='lightblue')
        fallback_path = f"fallback_{int(time.time())}.png"
        img.save(fallback_path)
        return fallback_path

class SubtitleGenerator:
    """Generates subtitles for the video"""
    
    def generate_srt(self, text_segments: List[str], audio_duration: float) -> str:
        """Generate SRT subtitle file"""
        srt_content = ""
        segment_duration = audio_duration / len(text_segments)
        
        for i, segment in enumerate(text_segments):
            start_time = i * segment_duration
            end_time = (i + 1) * segment_duration
            
            start_srt = self._seconds_to_srt_time(start_time)
            end_srt = self._seconds_to_srt_time(end_time)
            
            srt_content += f"{i + 1}\n"
            srt_content += f"{start_srt} --> {end_srt}\n"
            srt_content += f"{segment}\n\n"
        
        srt_path = f"temp_subtitles_{int(time.time())}.srt"
        with open(srt_path, 'w', encoding='utf-8') as f:
            f.write(srt_content)
        
        return srt_path
    
    def _seconds_to_srt_time(self, seconds: float) -> str:
        """Convert seconds to SRT time format"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millisecs = int((seconds % 1) * 1000)
        
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millisecs:03d}"

class VideoComposer:
    """Composes final video from generated assets"""
    
    def __init__(self):
        pass
    
    def compose_video(self, 
                     text_segments: List[str],
                     image_paths: List[str], 
                     audio_path: str,
                     config: VideoConfig,
                     subtitle_path: Optional[str] = None) -> Tuple[str, VideoMetrics]:
        """Compose final video from all components"""
        
        start_time = time.time()
        
        try:
            # Load audio to get duration
            audio_clip = mp.AudioFileClip(audio_path)
            total_duration = audio_clip.duration
            
            # Calculate duration per image
            duration_per_image = total_duration / len(image_paths)
            
            # Create video clips from images
            video_clips = []
            for i, img_path in enumerate(image_paths):
                img_clip = mp.ImageClip(img_path, duration=duration_per_image)
                
                # Add transitions and effects
                if i > 0:  # Add fade transition between clips
                    img_clip = img_clip.fadeout(0.5).fadein(0.5)
                
                video_clips.append(img_clip)
            
            # Concatenate all video clips
            final_video = mp.concatenate_videoclips(video_clips)
            
            # Set audio
            final_video = final_video.set_audio(audio_clip)
            
            # Add subtitles if requested
            if config.include_subtitles and subtitle_path:
                # Note: moviepy subtitle integration would go here
                pass
            
            # Add background music if requested
            if config.include_background_music:
                bg_music = self._generate_background_music(config, total_duration)
                if bg_music:
                    # Mix background music with narration
                    bg_music = bg_music.volumex(0.3)  # Lower volume for background
                    final_audio = mp.CompositeAudioClip([audio_clip, bg_music])
                    final_video = final_video.set_audio(final_audio)
            
            # Export final video
            output_path = f"generated_video_{int(time.time())}.mp4"
            final_video.write_videofile(
                output_path,
                fps=config.fps,
                codec='libx264',
                audio_codec='aac',
                temp_audiofile='temp-audio.m4a',
                remove_temp=True
            )
            
            # Calculate metrics
            end_time = time.time()
            metrics = VideoMetrics(
                inference_time=end_time - start_time,
                memory_usage=self._get_memory_usage(),
                gpu_usage=self._get_gpu_usage(),
                frame_rate=config.fps,
                scene_fidelity_score=0.85,  # Placeholder - would need actual evaluation
                generation_cost=self._calculate_cost(total_duration, len(image_paths))
            )
            
            # Cleanup
            audio_clip.close()
            final_video.close()
            
            return output_path, metrics
            
        except Exception as e:
            logger.error(f"Error composing video: {e}")
            raise
    
    def _generate_background_music(self, config: VideoConfig, duration: float) -> Optional[mp.AudioClip]:
        """Generate or select appropriate background music"""
        # This would integrate with a music generation API or library
        # For now, return None
        return None
    
    def _get_memory_usage(self) -> float:
        """Get current memory usage"""
        import psutil
        return psutil.virtual_memory().percent
    
    def _get_gpu_usage(self) -> float:
        """Get current GPU usage"""
        if torch.cuda.is_available():
            return torch.cuda.memory_allocated() / torch.cuda.max_memory_allocated() * 100
        return 0.0
    
    def _calculate_cost(self, duration: float, num_frames: int) -> float:
        """Calculate estimated generation cost"""
        # Rough cost estimation based on compute resources
        base_cost_per_second = 0.05  # $0.05 per second
        image_cost = num_frames * 0.02  # $0.02 per image
        return duration * base_cost_per_second + image_cost

class TextToVideoGenerator:
    """Main class that orchestrates the entire text-to-video generation process"""
    
    def __init__(self):
        self.text_processor = TextProcessor()
        self.audio_generator = AudioGenerator()
        self.visual_generator = VisualGenerator()
        self.subtitle_generator = SubtitleGenerator()
        self.video_composer = VideoComposer()
    
    def generate_video(self, text: str, config: VideoConfig) -> Tuple[str, VideoMetrics]:
        """Generate video from text with specified configuration"""
        
        logger.info(f"Starting video generation for text: {text[:50]}...")
        logger.info(f"Configuration: {config}")
        
        try:
            # Step 1: Process and segment text
            text_segments = self.text_processor.segment_text(text)
            logger.info(f"Text segmented into {len(text_segments)} parts")
            
            # Step 2: Generate audio narration
            logger.info("Generating audio narration...")
            audio_path = self.audio_generator.generate_narration(text, config)
            
            # Step 3: Generate visual scenes
            logger.info("Generating visual scenes...")
            image_paths = self.visual_generator.generate_scene_images(text_segments, config)
            
            # Step 4: Generate subtitles if requested
            subtitle_path = None
            if config.include_subtitles:
                logger.info("Generating subtitles...")
                # Get audio duration for subtitle timing
                audio_clip = mp.AudioFileClip(audio_path)
                subtitle_path = self.subtitle_generator.generate_srt(
                    text_segments, audio_clip.duration
                )
                audio_clip.close()
            
            # Step 5: Compose final video
            logger.info("Composing final video...")
            video_path, metrics = self.video_composer.compose_video(
                text_segments, image_paths, audio_path, config, subtitle_path
            )
            
            logger.info(f"Video generation completed: {video_path}")
            logger.info(f"Metrics: {metrics}")
            
            # Cleanup temporary files
            self._cleanup_temp_files([audio_path] + image_paths + 
                                   ([subtitle_path] if subtitle_path else []))
            
            return video_path, metrics
            
        except Exception as e:
            logger.error(f"Error in video generation: {e}")
            raise
    
    def _cleanup_temp_files(self, file_paths: List[str]):
        """Clean up temporary files"""
        for file_path in file_paths:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                logger.warning(f"Could not remove temporary file {file_path}: {e}")

# Example usage and API endpoint
class VideoGenerationAPI:
    """REST API wrapper for the video generation system"""
    
    def __init__(self):
        self.generator = TextToVideoGenerator()
    
    def generate_video_endpoint(self, request_data: Dict) -> Dict:
        """API endpoint for video generation"""
        try:
            # Parse request
            text = request_data.get('text', '')
            
            config = VideoConfig(
                tone=Tone(request_data.get('tone', 'formal')),
                domain=Domain(request_data.get('domain', 'education')),
                environment=Environment(request_data.get('environment', 'studio')),
                duration=request_data.get('duration', 30),
                language=request_data.get('language', 'en'),
                include_subtitles=request_data.get('include_subtitles', True),
                include_background_music=request_data.get('include_background_music', False),
                avatar_narration=request_data.get('avatar_narration', False)
            )
            
            # Generate video
            video_path, metrics = self.generator.generate_video(text, config)
            
            return {
                'status': 'success',
                'video_path': video_path,
                'metrics': {
                    'inference_time': metrics.inference_time,
                    'memory_usage': metrics.memory_usage,
                    'gpu_usage': metrics.gpu_usage,
                    'frame_rate': metrics.frame_rate,
                    'scene_fidelity_score': metrics.scene_fidelity_score,
                    'generation_cost': metrics.generation_cost
                }
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }

# Example usage
if __name__ == "__main__":
    # Example text (could be a PIB press release)
    sample_text = """
    The Government of India announces new digital literacy initiatives to empower rural communities. 
    These programs will provide technology training and internet access to remote villages across the country. 
    The initiative aims to bridge the digital divide and ensure inclusive growth for all citizens.
    """
    
    # Configuration for a governance video
    config = VideoConfig(
        tone=Tone.FORMAL,
        domain=Domain.GOVERNANCE,
        environment=Environment.RURAL,
        duration=30,
        include_subtitles=True,
        include_background_music=True
    )
    
    # Generate video
    generator = TextToVideoGenerator()
    try:
        video_path, metrics = generator.generate_video(sample_text, config)
        print(f"Video generated successfully: {video_path}")
        print(f"Generation metrics: {metrics}")
    except Exception as e:
        print(f"Error generating video: {e}")