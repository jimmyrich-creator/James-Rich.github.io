from PIL import Image
import sys
import math

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
        print(f"Processed {input_path} -> {output_path}")
    except Exception as e:
        print(f"Error processing {input_path}: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python remove_bg.py <input> <output>")
    else:
        remove_background(sys.argv[1], sys.argv[2])
