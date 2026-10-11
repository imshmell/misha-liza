"""Готовит медиа для сайта из оригиналов в source-media/.

- фото → public/media/photos/<имя>.webp (авто-поворот, до 2400px, без EXIF/GPS)
- видео → public/media/video/<имя>.mp4 (H.264, до 1080p, faststart, без метаданных) + постер .webp
- сопоставляет превью из ворда (картинки N) с оригиналами → src/lib/media-map.json

Запуск: python scripts/process-media.py
"""
import json
import os
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "source-media"
DOCX_MEDIA = Path(sys.argv[1]) if len(sys.argv) > 1 else None
OUT_PHOTO = ROOT / "public" / "media" / "photos"
OUT_VIDEO = ROOT / "public" / "media" / "video"
MAP_FILE = ROOT / "src" / "lib" / "media-map.json"

PHOTO_EXT = {".jpg", ".jpeg", ".png", ".heic"}
VIDEO_EXT = {".mp4", ".mov", ".m4v"}


def slug(name: str) -> str:
    return Path(name).stem.replace(" ", "_").replace("(", "").replace(")", "")


def dhash(img: Image.Image, size: int = 16) -> int:
    g = img.convert("L").resize((size + 1, size), Image.LANCZOS)
    px = list(g.getdata())
    bits = 0
    for y in range(size):
        for x in range(size):
            bits = (bits << 1) | (px[y * (size + 1) + x] > px[y * (size + 1) + x + 1])
    return bits


def process_photos():
    OUT_PHOTO.mkdir(parents=True, exist_ok=True)
    hashes = {}
    for p in sorted(SRC.iterdir()):
        if p.suffix.lower() not in PHOTO_EXT:
            continue
        out = OUT_PHOTO / f"{slug(p.name)}.webp"
        img = ImageOps.exif_transpose(Image.open(p)).convert("RGB")
        if not out.exists():
            im = img.copy()
            im.thumbnail((2400, 2400), Image.LANCZOS)
            im.save(out, "WEBP", quality=82, method=6)
        hashes[slug(p.name)] = (dhash(img), img.size)
        print("photo", out.name, flush=True)
    return hashes


def ffprobe_size(p: Path):
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:stream_side_data=rotation",
         "-of", "json", str(p)], capture_output=True, text=True)
    return json.loads(r.stdout)


def used_videos():
    import re
    story = (ROOT / "src" / "lib" / "story.ts").read_text(encoding="utf-8")
    return set(re.findall(r'"([^"]+\.(?:mp4|mov|m4v))"', story, re.I))


def process_videos():
    OUT_VIDEO.mkdir(parents=True, exist_ok=True)
    used = used_videos()
    for p in sorted(SRC.iterdir()):
        if p.suffix.lower() not in VIDEO_EXT or p.name not in used:
            continue
        name = slug(p.name)
        out = OUT_VIDEO / f"{name}.mp4"
        poster = OUT_VIDEO / f"{name}.webp"
        if not out.exists():
            # короткая сторона ≤1080, кратно 2; ffmpeg сам применяет поворот из метаданных
            vf = "fps=30,scale='if(gt(iw,ih),-2,min(1080,iw))':'if(gt(iw,ih),min(1080,ih),-2)'"
            subprocess.run([
                "ffmpeg", "-y", "-loglevel", "error", "-i", str(p),
                "-map_metadata", "-1", "-vf", vf,
                "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-maxrate", "3M", "-bufsize", "6M",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(out)], check=True)
        if not poster.exists():
            subprocess.run([
                "ffmpeg", "-y", "-loglevel", "error", "-ss", "0.5", "-i", str(out),
                "-frames:v", "1", "-q:v", "80", str(poster)], check=True)
        print("video", out.name, out.stat().st_size // 1024, "KB", flush=True)


def map_docx_previews(hashes):
    if not DOCX_MEDIA:
        return {}
    mapping = {}
    for f in sorted(DOCX_MEDIA.iterdir(), key=lambda x: int("".join(c for c in x.stem if c.isdigit()))):
        n = int("".join(c for c in f.stem if c.isdigit()))
        prev = Image.open(f).convert("RGB")
        best = None
        for rot in (0, 90, 180, 270):
            h = dhash(prev.rotate(rot, expand=True))
            for name, (oh, _) in hashes.items():
                d = bin(h ^ oh).count("1")
                if best is None or d < best[0]:
                    best = (d, name, rot)
        mapping[f"p{n}"] = {"file": best[1], "distance": best[0], "rotation": best[2]}
        print(f"p{n} -> {best[1]} (dist {best[0]}, rot {best[2]})", flush=True)
    return mapping


if __name__ == "__main__":
    h = process_photos()
    m = map_docx_previews(h)
    if m:
        MAP_FILE.write_text(json.dumps(m, ensure_ascii=False, indent=2), encoding="utf-8")
    process_videos()
    print("DONE")
