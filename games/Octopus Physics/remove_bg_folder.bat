@echo off
rem = """
setlocal Enabledelayedexpansion

echo Checking for Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not added to your system PATH.
    echo Please install Python and try again.
    pause
    goto :eof
)

echo Checking for Pillow (PIL) library...
python -c "import PIL" >nul 2>&1
if errorlevel 1 (
    echo Pillow is required but not installed.
    echo Attempting to install Pillow automatically...
    python -m pip install Pillow
    if errorlevel 1 (
        echo Failed to automatically install Pillow. 
        echo Please run: pip install Pillow
        pause
        goto :eof
    )
)

echo.
echo Running background extraction on all images in this folder...
python -x "%~f0" "%~dp0." "%~dp0." 50
echo.
echo Done!
pause
goto :eof
rem """
import os
import sys
import math
from PIL import Image

def remove_background(input_path, output_path, tolerance=50):
    try:
        # Check if the output file already exists and if it's the exact same path
        # to avoid reading and writing to the same file descriptor simultaneously.
        is_same_file = os.path.abspath(input_path).lower() == os.path.abspath(output_path).lower()
        
        img = Image.open(input_path).convert("RGBA")
        pixels = img.load()
        width, height = img.size
        
        # Get background color from the top-left corner
        bg_color = pixels[0, 0]
        
        # Flood fill from all 4 corners to find background pixels
        stack = [(0, 0), (width-1, 0), (0, height-1), (width-1, height-1)]
        visited = set(stack)
        
        def color_distance(c1, c2):
            return math.sqrt(sum((a - b) ** 2 for a, b in zip(c1[:3], c2[:3])))

        while stack:
            x, y = stack.pop()
            pixels[x, y] = (0, 0, 0, 0)
            
            for dx, dy in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited:
                    visited.add((nx, ny))
                    if color_distance(pixels[nx, ny], bg_color) < tolerance:
                        stack.append((nx, ny))
        
        # If we are overwriting, close the original image reader before saving
        if is_same_file:
            img_format = "PNG"
            # We save temporary and rename to prevent file access lock issues
            temp_output = output_path + ".tmp"
            img.save(temp_output, img_format)
            img.close()
            if os.path.exists(output_path):
                os.remove(output_path)
            os.rename(temp_output, output_path)
        else:
            img.save(output_path, "PNG")
            img.close()
            
        print(f"Processed: {os.path.basename(input_path)} -> {os.path.basename(output_path)}")
    except Exception as e:
        print(f"Error processing {os.path.basename(input_path)}: {e}")

def process_batch(input_dir, output_dir, tolerance=50):
    if not os.path.exists(input_dir):
        print(f"Error: Input directory '{input_dir}' does not exist.")
        return
        
    os.makedirs(output_dir, exist_ok=True)
    
    valid_extensions = ('.png', '.jpg', '.jpeg', '.bmp', '.webp', '.tiff')
    images = [f for f in os.listdir(input_dir) if f.lower().endswith(valid_extensions)]
    
    if not images:
        print(f"No image files found in '{input_dir}'.")
        return
        
    print(f"Found {len(images)} images. Starting extraction...")
    
    for filename in images:
        input_path = os.path.join(input_dir, filename)
        name_without_ext = os.path.splitext(filename)[0]
        output_path = os.path.join(output_dir, f"{name_without_ext}.png")
        remove_background(input_path, output_path, tolerance)

if __name__ == "__main__":
    input_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    output_dir = sys.argv[2] if len(sys.argv) > 2 else input_dir
    tolerance = 50
    if len(sys.argv) > 3:
        try:
            tolerance = int(sys.argv[3])
        except ValueError:
            pass
            
    process_batch(input_dir, output_dir, tolerance)
