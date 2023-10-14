import glob
import os
import re

def get_used_images(md_files_dir):
    # Regex pattern to find image references in markdown files
    img_pattern = re.compile(r'\(/images/([^)]+)\)')
    used_images = set()
    
    # Glob all markdown files
    md_files = glob.glob(os.path.join(md_files_dir, '*.md'))
    
    for md_file in md_files:
        with open(md_file, 'r', encoding='utf-8') as file:
            content = file.read()
            # Find all image references in the current markdown file
            img_refs = img_pattern.findall(content)
            used_images.update(img_refs)
    
    return used_images

def delete_unused_images(used_images, img_dir):
    # Glob all image files
    all_images = glob.glob(os.path.join(img_dir, '*'))
    
    for img_file in all_images:
        img_name = os.path.basename(img_file)
        if img_name not in used_images:
            os.remove(img_file)
            print(f'Deleted: {img_file}')

def main():
    source_dir = 'source'
    md_files_dir = os.path.join(source_dir, '_posts')
    img_dir = os.path.join(source_dir, 'images')
    
    used_images = get_used_images(md_files_dir)
    delete_unused_images(used_images, img_dir)

if __name__ == '__main__':
    main()