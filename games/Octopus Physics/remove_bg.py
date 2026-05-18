from PIL import Image
import sys
import math
import os

def remove_background(input_path, output_path, tolerance=50):
    try:
        img = Image.open(input_path).convert("RGBA")
        pixels = img.load()
        width, height = img.size
        
        # Get background color from the top-left corner
        bg_color = pixels[0, 0]
        
        # We will use a flood fill algorithm from all 4 corners to find background pixels
        # This handles solid backgrounds even if the main subject has similar colors internally
        stack = [(0, 0), (width-1, 0), (0, height-1), (width-1, height-1)]
        visited = set(stack)
        
        def color_distance(c1, c2):
            return math.sqrt(sum((a - b) ** 2 for a, b in zip(c1[:3], c2[:3])))

        while stack:
            x, y = stack.pop()
            
            # Make it transparent
            pixels[x, y] = (0, 0, 0, 0)
            
            # Check neighbors
            for dx, dy in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited:
                    visited.add((nx, ny))
                    if color_distance(pixels[nx, ny], bg_color) < tolerance:
                        stack.append((nx, ny))
                        
        img.save(output_path, "PNG")
        print(f"Processed: {input_path} -> {output_path}")
    except Exception as e:
        print(f"Error processing {input_path}: {e}")

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
        
    print(f"Found {len(images)} images in '{input_dir}'. Processing...")
    
    for filename in images:
        input_path = os.path.join(input_dir, filename)
        # Save as PNG in the output directory
        name_without_ext = os.path.splitext(filename)[0]
        output_path = os.path.join(output_dir, f"{name_without_ext}.png")
        remove_background(input_path, output_path, tolerance)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  Single file:  python remove_bg.py <input_file> <output_file> [tolerance]")
        print("  Batch folder: python remove_bg.py <input_directory> [output_directory] [tolerance]")
        sys.exit(1)
        
    path_arg = sys.argv[1]
    
    if os.path.isdir(path_arg):
        # Batch directory mode
        input_dir = path_arg
        
        # Parse arguments for batch mode:
        # e.g., script.py <input_dir> <output_dir> <tolerance>
        # or    script.py <input_dir> <tolerance> (defaulting output to input_dir/no_bg)
        # or    script.py <input_dir>
        output_dir = None
        tolerance = 50
        
        if len(sys.argv) == 2:
            output_dir = os.path.join(input_dir, "no_bg")
        elif len(sys.argv) == 3:
            # Check if second arg is a tolerance integer
            try:
                tolerance = int(sys.argv[2])
                output_dir = os.path.join(input_dir, "no_bg")
            except ValueError:
                output_dir = sys.argv[2]
        else:
            output_dir = sys.argv[2]
            try:
                tolerance = int(sys.argv[3])
            except ValueError:
                pass
                
        process_batch(input_dir, output_dir, tolerance)
    else:
        # Single file mode
        if len(sys.argv) < 3:
            print("For single file mode, you must provide an output file path.")
            print("Usage: python remove_bg.py <input_file> <output_file> [tolerance]")
            sys.exit(1)
            
        output_file = sys.argv[2]
        tolerance = 50
        if len(sys.argv) > 3:
            try:
                tolerance = int(sys.argv[3])
            except ValueError:
                pass
                
        remove_background(path_arg, output_file, tolerance)
