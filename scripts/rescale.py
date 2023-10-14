from PIL import Image
import glob
import os

def resize_and_convert(img_path, output_dir):
    try:
        with Image.open(img_path) as img:
            # Determine new dimensions
            width, height = img.size
            if max(width, height) > 1024:
                if width > height:
                    new_width = 1024
                    new_height = int((height / width) * 1024)
                else:
                    new_height = 1024
                    new_width = int((width / height) * 1024)
                
                # Resize the image
                img_resized = img.resize((new_width, new_height))
            else:
                img_resized = img
            
            # Determine output path
            basename = os.path.basename(img_path)
            filename, _ = os.path.splitext(basename)
            filename = filename.replace(" ", "_")
            output_path = os.path.join(output_dir, f'{filename}.jpg')
            
            # Save the image in JPEG format
            img_resized.convert('RGB').save(output_path, 'JPEG')
            print(f'Saved: {output_path}')
    except Exception as e:
        print(f'Error processing {img_path}: {e}')

def process_images(img_dir, output_dir):
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Glob all image files (excluding GIFs)
    img_files = glob.glob(os.path.join(img_dir, '*'))
    img_files = [f for f in img_files if not f.lower().endswith('.gif')]
    
    for img_file in img_files:
        resize_and_convert(img_file, output_dir)

def main():
    source_dir = 'source'
    img_dir = os.path.join(source_dir, 'newimgs')
    output_dir = os.path.join(source_dir, 'resized_images')
    
    process_images(img_dir, output_dir)

if __name__ == '__main__':
    main()