"""woff2 -> ttf so PIL can render them. Run after npm install of the fontsource packages."""
from fontTools.ttLib import TTFont
import glob, os

os.makedirs('ttf', exist_ok=True)
patterns = [
    'node_modules/@fontsource/*/files/*arabic-400-normal.woff2',
    'node_modules/@fontsource/*/files/*urdu-400-normal.woff2',
]
for pattern in patterns:
    for w in glob.glob(pattern):
        f = TTFont(w)
        f.flavor = None
        out = os.path.join('ttf', os.path.basename(w).replace('.woff2', '.ttf'))
        f.save(out)
        print('converted', out)
