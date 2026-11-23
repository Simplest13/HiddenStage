from PIL import Image
import os, glob

files = sorted(glob.glob('hiddenstage-frontend/e2e-artifacts/dark-theme/*.png'))
print(f"Total screenshots: {len(files)}")
for f in files:
    im = Image.open(f)
    print(f"{os.path.basename(f):35} {im.size[0]}x{im.size[1]} ({os.path.getsize(f):,} bytes)")
