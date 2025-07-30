
import cv2
import numpy as np
import os

def remove_watermark(input_file, output_file, x, y, w, h):
    """
    Remove watermark from video using inpainting
    
    Args:
        input_file: path to input video
        output_file: path to output video
        x, y: top-left coordinates of watermark
        w, h: width and height of watermark region
    """
    
    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' not found!")
        return False
    
    # Open video
    cap = cv2.VideoCapture(input_file)
    if not cap.isOpened():
        print(f"Error: Cannot open video file '{input_file}'")
        return False
    
    # Get video properties
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    print(f"Video info: {width}x{height}, {fps} FPS, {total_frames} frames")
    
    # Try different codecs
    codecs = [
        cv2.VideoWriter_fourcc(*'mp4v'),
        cv2.VideoWriter_fourcc(*'XVID'),
        cv2.VideoWriter_fourcc(*'MJPG'),
        cv2.VideoWriter_fourcc(*'X264')
    ]
    
    writer = None
    for codec in codecs:
        writer = cv2.VideoWriter(output_file, codec, fps, (width, height))
        if writer.isOpened():
            print(f"Using codec: {codec}")
            break
    
    if not writer or not writer.isOpened():
        print("Error: Cannot create output video writer")
        cap.release()
        return False
    
    # Create mask for watermark region
    mask = np.zeros((height, width), dtype=np.uint8)
    mask[y:y+h, x:x+w] = 255
    
    # Process frames
    frame_count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Apply inpainting
        cleaned_frame = cv2.inpaint(frame, mask, 3, cv2.INPAINT_TELEA)
        writer.write(cleaned_frame)
        
        frame_count += 1
        if frame_count % 100 == 0:
            print(f"Processed {frame_count}/{total_frames} frames")
    
    # Clean up
    cap.release()
    writer.release()
    
    print(f"Successfully processed {frame_count} frames")
    print(f"Output saved to: {output_file}")
    return True

# Example usage:
if __name__ == "__main__":
# --- I/O --------------------------------------------------------------------
    IN_FILE  = "/home/ql-ai/Desktop/kalaShetuMVC/outputs/invideo-ai-1080 India’s Digital Revolution_ Rural Commun 2025-07-29.mp4"          # source video with watermark
    OUT_FILE = "/home/ql-ai/Desktop/kalaShetuMVC/outputs/output_clean.mp4"   # destination without watermark
    
    # Watermark coordinates (you need to measure these)
    watermark_x = 50
    watermark_y = 40
    watermark_width = 120
    watermark_height = 35

    success = remove_watermark(IN_FILE, OUT_FILE, 
                             watermark_x, watermark_y, 
                             watermark_width, watermark_height)
    
    if success:
        print("Watermark removal completed!")
    else:
        print("Failed to remove watermark. Check the error messages above.")

