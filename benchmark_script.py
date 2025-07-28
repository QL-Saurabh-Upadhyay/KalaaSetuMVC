import time
import psutil
import torch
import json
import statistics
from datetime import datetime
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd

class VideoBenchmark:
    def __init__(self):
        self.results = []
        self.system_metrics = []
    
    def benchmark_text_processing(self, text_lengths=[100, 500, 1000, 2000]):
        """Benchmark text processing performance"""
        from text_to_video_system import TextProcessor
        
        processor = TextProcessor()
        results = []
        
        for length in text_lengths:
            # Generate test text
            test_text = "This is a test sentence. " * (length // 25)
            
            # Benchmark segmentation
            start_time = time.time()
            segments = processor.segment_text(test_text)
            end_time = time.time()
            
            results.append({
                'text_length': length,
                'processing_time': end_time - start_time,
                'segments_count': len(segments),
                'avg_segment_length': sum(len(s) for s in segments) / len(segments) if segments else 0
            })
        
        return results
    
    def benchmark_memory_usage(self, config_variations):
        """Benchmark memory usage across different configurations"""
        import gc
        
        results = []
        
        for config in config_variations:
            gc.collect()  # Clean up memory
            
            initial_memory = psutil.virtual_memory().used / (1024**3)  # GB
            initial_gpu = torch.cuda.memory_allocated() / (1024**3) if torch.cuda.is_available() else 0
            
            try:
                # Simulate video generation components
                from text_to_video_system import TextProcessor, AudioGenerator, VisualGenerator
                
                processor = TextProcessor()
                audio_gen = AudioGenerator()
                visual_gen = VisualGenerator()
                
                # Process sample text
                test_text = "Sample text for memory benchmarking. " * 20
                segments = processor.segment_text(test_text)
                
                peak_memory = psutil.virtual_memory().used / (1024**3)
                peak_gpu = torch.cuda.memory_allocated() / (1024**3) if torch.cuda.is_available() else 0
                
                results.append({
                    'config': config['name'],
                    'resolution': config.get('resolution', (1920, 1080)),
                    'duration': config.get('duration', 30),
                    'initial_memory_gb': initial_memory,
                    'peak_memory_gb': peak_memory,
                    'memory_increase_gb': peak_memory - initial_memory,
                    'initial_gpu_gb': initial_gpu,
                    'peak_gpu_gb': peak_gpu,
                    'gpu_increase_gb': peak_gpu - initial_gpu
                })
                
            except Exception as e:
                results.append({
                    'config': config['name'],
                    'error': str(e)
                })
        
        return results
    
    def benchmark_generation_speed(self, text_samples, num_runs=3):
        """Benchmark end-to-end generation speed"""
        from text_to_video_system import TextToVideoGenerator, VideoConfig, Tone, Domain, Environment
        from unittest.mock import patch, Mock
        
        generator = TextToVideoGenerator()
        results = []
        
        # Mock the heavy operations for speed testing
        with patch.object(generator.audio_generator, 'generate_narration') as mock_audio, \
             patch.object(generator.visual_generator, 'generate_scene_images') as mock_visual, \
             patch.object(generator.video_composer, 'compose_video') as mock_compose:
            
            mock_audio.return_value = "test_audio.wav"
            mock_visual.return_value = ["test_image.png"]
            mock_compose.return_value = ("test_video.mp4", Mock(
                inference_time=5.0, memory_usage=50.0, gpu_usage=25.0,
                frame_rate=24.0, scene_fidelity_score=0.85, generation_cost=1.5
            ))
            
            for text_sample in text_samples:
                config = VideoConfig(
                    tone=Tone.FORMAL,
                    domain=Domain.EDUCATION,
                    environment=Environment.STUDIO,
                    duration=len(text_sample.split()) // 2  # Rough duration estimate
                )
                
                run_times = []
                for run in range(num_runs):
                    start_time = time.time()
                    try:
                        video_path, metrics = generator.generate_video(text_sample, config)
                        end_time = time.time()
                        run_times.append(end_time - start_time)
                    except Exception as e:
                        print(f"Error in run {run}: {e}")
                        run_times.append(float('inf'))
                
                if run_times and any(t != float('inf') for t in run_times):
                    valid_times = [t for t in run_times if t != float('inf')]
                    results.append({
                        'text_length': len(text_sample),
                        'word_count': len(text_sample.split()),
                        'avg_time': statistics.mean(valid_times),
                        'min_time': min(valid_times),
                        'max_time': max(valid_times),
                        'std_dev': statistics.stdev(valid_times) if len(valid_times) > 1 else 0,
                        'success_rate': len(valid_times) / num_runs * 100
                    })
        
        return results
    
    def run_comprehensive_benchmark(self):
        """Run all benchmarks and generate report"""
        print("Starting comprehensive benchmark...")
        
        # Text processing benchmark
        print("1. Benchmarking text processing...")
        text_results = self.benchmark_text_processing()
        
        # Memory usage benchmark
        print("2. Benchmarking memory usage...")
        config_variations = [
            {'name': 'low_res', 'resolution': (640, 360), 'duration': 15},
            {'name': 'medium_res', 'resolution': (1280, 720), 'duration': 30},
            {'name': 'high_res', 'resolution': (1920, 1080), 'duration': 45},
        ]
        memory_results = self.benchmark_memory_usage(config_variations)
        
        # Speed benchmark
        print("3. Benchmarking generation speed...")
        text_samples = [
            "Short test text for video generation.",
            "Medium length test text for video generation with multiple sentences. This should take longer to process and generate video content.",
            "Long test text for comprehensive video generation benchmarking. This text contains multiple sentences and should result in a longer video with multiple scenes. The generation process should handle this extended content appropriately and produce quality output with proper timing and transitions between different segments of the content."
        ]
        speed_results = self.benchmark_generation_speed(text_samples)
        
        # Compile results
        benchmark_report = {
            'timestamp': datetime.now().isoformat(),
            'system_info': {
                'cpu_count': psutil.cpu_count(),
                'memory_gb': psutil.virtual_memory().total / (1024**3),
                'gpu_available': torch.cuda.is_available(),
                'gpu_count': torch.cuda.device_count() if torch.cuda.is_available() else 0
            },
            'text_processing': text_results,
            'memory_usage': memory_results,
            'generation_speed': speed_results
        }
        
        # Save results
        with open(f'benchmark_results_{int(time.time())}.json', 'w') as f:
            json.dump(benchmark_report, f, indent=2)
        
        # Generate visualizations
        self.generate_benchmark_plots(benchmark_report)
        
        return benchmark_report
    
    def generate_benchmark_plots(self, results):
        """Generate visualization plots for benchmark results"""
        plt.style.use('seaborn-v0_8')
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        
        # Text processing performance
        if results['text_processing']:
            df_text = pd.DataFrame(results['text_processing'])
            axes[0, 0].plot(df_text['text_length'], df_text['processing_time'], 'bo-')
            axes[0, 0].set_xlabel('Text Length (characters)')
            axes[0, 0].set_ylabel('Processing Time (seconds)')
            axes[0, 0].set_title('Text Processing Performance')
            axes[0, 0].grid(True)
        
        # Memory usage
        if results['memory_usage']:
            df_memory = pd.DataFrame([r for r in results['memory_usage'] if 'error' not in r])
            if not df_memory.empty:
                x_pos = range(len(df_memory))
                axes[0, 1].bar(x_pos, df_memory['memory_increase_gb'], alpha=0.7)
                axes[0, 1].set_xlabel('Configuration')
                axes[0, 1].set_ylabel('Memory Increase (GB)')
                axes[0, 1].set_title('Memory Usage by Configuration')
                axes[0, 1].set_xticks(x_pos)
                axes[0, 1].set_xticklabels(df_memory['config'], rotation=45)
        
        # Generation speed
        if results['generation_speed']:
            df_speed = pd.DataFrame(results['generation_speed'])
            axes[1, 0].scatter(df_speed['word_count'], df_speed['avg_time'], alpha=0.7)
            axes[1, 0].set_xlabel('Word Count')
            axes[1, 0].set_ylabel('Average Generation Time (seconds)')
            axes[1, 0].set_title('Generation Speed vs Text Length')
            axes[1, 0].grid(True)
        
        # Success rate
        if results['generation_speed']:
            df_speed = pd.DataFrame(results['generation_speed'])
            axes[1, 1].bar(range(len(df_speed)), df_speed['success_rate'], alpha=0.7)
            axes[1, 1].set_xlabel('Test Case')
            axes[1, 1].set_ylabel('Success Rate (%)')
            axes[1, 1].set_title('Generation Success Rate')
            axes[1, 1].set_ylim(0, 100)
        
        plt.tight_layout()
        plt.savefig(f'benchmark_plots_{int(time.time())}.png', dpi=300, bbox_inches='tight')
        plt.show()
        
        print("Benchmark plots saved and displayed.")

if __name__ == "__main__":
    benchmark = VideoBenchmark()
    results = benchmark.run_comprehensive_benchmark()
    
    print("\n" + "="*50)
    print("BENCHMARK RESULTS SUMMARY")
    print("="*50)
    
    # Print key metrics
    if results['text_processing']:
        avg_processing_time = statistics.mean([r['processing_time'] for r in results['text_processing']])
        print(f"Average text processing time: {avg_processing_time:.3f}s")
    
    if results['memory_usage']:
        valid_memory = [r for r in results['memory_usage'] if 'error' not in r]
        if valid_memory:
            avg_memory_increase = statistics.mean([r['memory_increase_gb'] for r in valid_memory])
            print(f"Average memory increase: {avg_memory_increase:.2f}GB")
    
    if results['generation_speed']:
        avg_gen_time = statistics.mean([r['avg_time'] for r in results['generation_speed']])
        avg_success_rate = statistics.mean([r['success_rate'] for r in results['generation_speed']])
        print(f"Average generation time: {avg_gen_time:.2f}s")
        print(f"Average success rate: {avg_success_rate:.1f}%")
    
    print(f"\nFull results saved to benchmark_results_{int(time.time())}.json")