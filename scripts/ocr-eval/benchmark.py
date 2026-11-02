from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display
import pytesseract, jiwer

ARABIC = [
    "الفعل الماضي ما دل على حدث في الزمان الماضي",
    "الكلمة لفظ وضع لمعنى مفرد وهي اسم وفعل وحرف",
    "الاسم ما دل على معنى في نفسه ولم يقترن بزمان",
    "الفاعل مرفوع والمفعول به منصوب والمضاف اليه مجرور",
]
URDU = [
    "فعل ماضی وہ ہے جو گزرے ہوئے زمانے پر دلالت کرے",
    "کلمہ کی تین قسمیں ہیں اسم فعل اور حرف",
    "اسم وہ کلمہ ہے جس کا معنی مستقل ہو",
    "فاعل مرفوع ہوتا ہے اور مفعول منصوب",
]

def render(text, font_path, tag, i, size=56, pad=36):
    shaped = get_display(arabic_reshaper.reshape(text))
    font = ImageFont.truetype(font_path, size)
    d0 = ImageDraw.Draw(Image.new("RGB",(10,10)))
    b = d0.textbbox((0,0), shaped, font=font)
    img = Image.new("RGB", (b[2]-b[0]+pad*2, b[3]-b[1]+pad*2), "white")
    ImageDraw.Draw(img).text((pad-b[0], pad-b[1]), shaped, font=font, fill="black")
    p = f"{tag}_{i}.png"; img.save(p); return p

def unrev(s):
    return " ".join(w[::-1] for w in s.split()[::-1])

def run(name, lines, font, tag):
    refs, best = [], []
    print(f"\n{'='*64}\n{name}\n{'='*64}")
    for i, line in enumerate(lines):
        p = render(line, font, tag, i)
        got = pytesseract.image_to_string(Image.open(p), lang="ara").strip().replace("\n"," ")
        cand = min([got, unrev(got)], key=lambda c: jiwer.cer([line],[c]) if c else 9)
        refs.append(line); best.append(cand)
        print(f"\n  ref: {line}")
        print(f"  ocr: {cand if cand else '(empty)'}")
    print(f"\n  >>> CER {jiwer.cer(refs,best):.3f}   WER {jiwer.wer(refs,best):.3f}")

run("ARABIC naskh — clean synthetic, best of raw/unreversed", ARABIC,
    "ttf/noto-naskh-arabic-arabic-400-normal.ttf", "ar")
run("URDU nastaliq — clean synthetic, best of raw/unreversed", URDU,
    "ttf/noto-nastaliq-urdu-arabic-400-normal.ttf", "ur")
