"""Build crisp PNG and multi-resolution ICO from the edited whale sprite."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
import struct

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src" / "renderer" / "assets"
SOURCE = ASSETS / "whale-tray-icon-pixel-source.png"
PNG_OUTPUT = ASSETS / "whale-tray-icon-pixel.png"
ICO_OUTPUT = ASSETS / "whale-tray-icon-pixel.ico"
TRAY_OUTPUTS = {
    16: ASSETS / "whale-tray-icon-pixel-16.png",
    20: ASSETS / "whale-tray-icon-pixel-20.png",
    21: ASSETS / "whale-tray-icon-pixel-21.png",
    24: ASSETS / "whale-tray-icon-pixel-24.png",
    32: ASSETS / "whale-tray-icon-pixel-32.png",
    40: ASSETS / "whale-tray-icon-pixel-40.png",
    48: ASSETS / "whale-tray-icon-pixel-48.png",
}
ICON_SIZES = (16, 20, 24, 32, 40, 48, 64, 96, 128, 256)
MASTER_SIZE = 512
# 大尺寸填满画布；小尺寸按档位留边，16–20 留 2px 左右，24–32 留 2–3px，40 以上尽量满。
LARGE_RATIO = 0.97
SMALL_RATIO = 0.96
SMALL_MAX_SIZE = 48


def ratio_for(size: int) -> float:
    # 托盘实际只有 16 逻辑像素，角色占满画布才不至于比旁边的图标小一圈；
    # 16 px 留 1 px 边，20 px 以上几乎占满。
    if size <= 16:
        return 0.90
    if size <= 20:
        return 0.98
    if size <= 32:
        return 0.97
    return SMALL_RATIO if size <= SMALL_MAX_SIZE else LARGE_RATIO


def master_sprite() -> Image.Image:
    source = Image.open(SOURCE).convert("RGBA")
    bounds = source.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Source image is completely transparent")

    cropped = source.crop(bounds)
    target = round(MASTER_SIZE * LARGE_RATIO)
    scale = target / max(cropped.width, cropped.height)
    resized = cropped.resize(
        (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (MASTER_SIZE, MASTER_SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((MASTER_SIZE - resized.width) // 2, (MASTER_SIZE - resized.height) // 2))

    # 保持原来的 64 色调色板与蓝色校正。
    alpha = canvas.getchannel("A").point(lambda value: 255 if value >= 128 else 0)
    reduced = canvas.quantize(
        colors=64,
        method=Image.Quantize.FASTOCTREE,
        dither=Image.Dither.NONE,
    ).convert("RGBA")
    reduced.putalpha(alpha)
    pixels = []
    for red, green, blue, opacity in reduced.get_flattened_data():
        if (
            opacity
            and 20 <= red < 130
            and 65 <= green < 170
            and 140 <= blue < 250
            and blue >= green + 42
            and blue >= red + 75
        ):
            red, green, blue = min(red + 13, 255), min(green + 4, 255), blue - 14
        pixels.append((red, green, blue, opacity))
    reduced.putdata(pixels)
    return reduced


def frame_for(size: int, master: Image.Image) -> Image.Image:
    # 从主图里取出角色本体，按目标占比重新缩放并居中，保证四个方向都有边距。
    bounds = master.getchannel("A").getbbox()
    if bounds is None:
        return Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sprite = master.crop(bounds)
    ratio = ratio_for(size)
    target = max(1, round(size * ratio))
    scale = target / max(sprite.width, sprite.height)
    resized = sprite.resize(
        (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((size - resized.width) // 2, (size - resized.height) // 2))
    return canvas


def save_ico(master: Image.Image) -> None:
    encoded = []
    for size in ICON_SIZES:
        buffer = BytesIO()
        frame_for(size, master).save(buffer, format="PNG", optimize=True)
        encoded.append((size, buffer.getvalue()))

    offset = 6 + 16 * len(encoded)
    with ICO_OUTPUT.open("wb") as icon:
        icon.write(struct.pack("<HHH", 0, 1, len(encoded)))
        for size, data in encoded:
            dimension = size if size < 256 else 0
            icon.write(
                struct.pack("<BBBBHHII", dimension, dimension, 0, 0, 1, 32, len(data), offset)
            )
            offset += len(data)
        for _, data in encoded:
            icon.write(data)


def main() -> None:
    master = master_sprite()
    master.save(PNG_OUTPUT, optimize=True)
    for size, path in TRAY_OUTPUTS.items():
        frame_for(size, master).save(path, optimize=True)
    save_ico(master)
    print(PNG_OUTPUT)
    for path in TRAY_OUTPUTS.values():
        print(path)
    print(ICO_OUTPUT)


if __name__ == "__main__":
    main()
