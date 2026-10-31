"""Pure bitmap artwork shared by the active AI-control indicator."""

import math
import os
import time
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

from windows_mcp.desktop.overlay_bitmap import premultiplied_bgra

_BORDER = 56
_CURSOR_SIZE = 88
_NOTICE_GLOW_PAD = 32
_BREATH_PERIOD_SECONDS = 3.0
_BREATH_MIN_ALPHA = 140
# 按键/鼠标高亮在松开后各自淡出的时长（秒）。
_KEY_LINGER_SECONDS = 1.8
_BUTTON_LINGER_SECONDS = 1.6
_NOTICE_TITLE = "AI 正在控制这台电脑"
_NOTICE_SHORTCUT = "Esc"
_NOTICE_HINT = f"按 {_NOTICE_SHORTCUT} 暂停控制"
_NOTICE_SUB_HINT = "对话不会中断，下次对话可以重新控制"


def _breath_opacity(elapsed: float) -> int:
    """Start bright and cycle smoothly while keeping the control cue visible."""
    strength = (1 + math.cos(2 * math.pi * elapsed / _BREATH_PERIOD_SECONDS)) / 2
    return round(_BREATH_MIN_ALPHA + (255 - _BREATH_MIN_ALPHA) * strength)


def _glow_alpha(depth: int, extent: int = _BORDER) -> int:
    """Peak at the screen edge and fade continuously to transparency inward."""
    if depth >= extent - 1:
        return 0
    return round(240 * (1 - depth / (extent - 1)) ** 1.4)


def _edge_bitmap(width: int, height: int, side: str, color: tuple[int, int, int]) -> bytes:
    """Pre-render feathered edges, joining corners at one glow strength."""
    image = Image.new("RGBA", (width, height))
    draw = ImageDraw.Draw(image)
    extent = min(_BORDER, height if side in ("top", "bottom") else width)
    corner_width = min(extent, width // 2)
    for depth in range(extent):
        # Let the gradient itself reach the edge; do not draw a separate outline.
        alpha = _glow_alpha(depth, extent)
        if side in ("top", "bottom"):
            y = depth if side == "top" else height - 1 - depth
            draw.line((0, y, width - 1, y), fill=(*color, alpha))
            # The side strips start below/above these corner squares. Use the
            # nearest screen edge as the depth, matching the straight strips
            # without blending two windows or drawing a diagonal bright seam.
            for side_depth in range(corner_width):
                corner_alpha = _glow_alpha(min(depth, side_depth), extent)
                draw.point((side_depth, y), fill=(*color, corner_alpha))
                draw.point((width - 1 - side_depth, y), fill=(*color, corner_alpha))
        elif side == "left":
            draw.line((depth, 0, depth, height - 1), fill=(*color, alpha))
        else:
            x = width - 1 - depth
            draw.line((x, 0, x, height - 1), fill=(*color, alpha))
    return premultiplied_bgra(image, 1.0)


def _cursor_bitmap(color: tuple[int, int, int]) -> bytes:
    """Build a broad cursor aura with no drawn ellipse or sharp contour."""
    half = (_CURSOR_SIZE - 1) / 2
    pixels = []
    for y in range(_CURSOR_SIZE):
        for x in range(_CURSOR_SIZE):
            radius = math.hypot(x - half, y - half)
            clear_center = 1 - math.exp(-0.5 * (max(0.0, radius - 1) / 5) ** 2)
            outer_glow = math.exp(-0.5 * (radius / 20) ** 2)
            edge_fade = min(1.0, max(0.0, (half - radius) / 8))
            alpha = round(230 * clear_center * outer_glow * edge_fade)
            pixels.append((*color, alpha))
    image = Image.new("RGBA", (_CURSOR_SIZE, _CURSOR_SIZE))
    image.putdata(pixels)
    return premultiplied_bgra(image, 1.0)


def _notice_shape_mask(width: int, height: int, radius: int = 22) -> Image.Image:
    """Downsample a rounded mask so all four corners have smooth pixel coverage."""
    scale = 8
    mask = Image.new("L", (width * scale, height * scale))
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, width * scale - 1, height * scale - 1), radius=radius * scale, fill=255
    )
    return mask.resize((width, height), Image.Resampling.LANCZOS).filter(
        ImageFilter.GaussianBlur(3)
    )


def _notice_panel_mask(width: int, height: int) -> Image.Image:
    """Fade the rounded panel through its outer eight pixels."""
    edge_fade = [round(255 * (step / 8) ** 2 * (3 - 2 * step / 8)) for step in range(9)]
    horizontal = [edge_fade[min(8, x, width - 1 - x)] for x in range(width)]
    vertical = [edge_fade[min(8, y, height - 1 - y)] for y in range(height)]
    fade_mask = Image.new("L", (width, height))
    fade_mask.putdata(
        [min(horizontal[x], vertical[y]) for y in range(height) for x in range(width)]
    )
    return ImageChops.multiply(_notice_shape_mask(width, height), fade_mask)


def _notice_bitmap(screen_width: int) -> tuple[int, int, bytes] | None:
    """Render a centered two-line prompt below the upper glow."""
    available_width = screen_width - 32
    if available_width < 200:
        return None
    horizontal_padding = 22 if screen_width >= 640 else 14
    font_dir = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts"
    # Prefer presentation-sized text, then shrink only when a monitor is narrow.
    for hint_size in range(24, 7, -1):
        try:
            title_font = ImageFont.truetype(str(font_dir / "msyhbd.ttc"), hint_size + 8)
            hint_font = ImageFont.truetype(str(font_dir / "msyh.ttc"), hint_size)
            sub_font = ImageFont.truetype(str(font_dir / "msyh.ttc"), max(10, hint_size - 3))
        except OSError:
            title_font = hint_font = ImageFont.load_default()
        measure = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
        title_box = measure.textbbox((0, 0), _NOTICE_TITLE, font=title_font)
        hint_box = measure.textbbox((0, 0), _NOTICE_HINT, font=hint_font)
        sub_box = measure.textbbox((0, 0), _NOTICE_SUB_HINT, font=sub_font)
        hint_prefix, _, hint_suffix = _NOTICE_HINT.partition(_NOTICE_SHORTCUT)
        prefix_width = math.ceil(measure.textlength(hint_prefix, font=hint_font))
        shortcut_width = math.ceil(measure.textlength(_NOTICE_SHORTCUT, font=hint_font))
        suffix_width = math.ceil(measure.textlength(hint_suffix, font=hint_font))
        title_width, title_height = title_box[2] - title_box[0], title_box[3] - title_box[1]
        hint_width, hint_height = (
            prefix_width + shortcut_width + suffix_width + 16,
            hint_box[3] - hint_box[1],
        )
        sub_width, sub_height = sub_box[2] - sub_box[0], sub_box[3] - sub_box[1]
        width = max(title_width, hint_width) + 2 * horizontal_padding
        if width <= available_width:
            break
    else:
        return None

    height = title_height + hint_height + 36
    image = Image.new("RGBA", (width, height), (8, 42, 88, 0))
    # Fade every edge from transparent to 80%; the rounded mask softens the corners too.
    image.putalpha(_notice_panel_mask(width, height).point(lambda alpha: round(alpha * 0.8)))
    draw = ImageDraw.Draw(image)
    title_y = 18 - title_box[1]
    hint_y = 28 + title_height - hint_box[1]
    draw.text(
        ((width - title_width) // 2 - title_box[0], title_y),
        _NOTICE_TITLE,
        font=title_font,
        fill=(248, 251, 255, 255),
    )
    hint_x = (width - hint_width) // 2
    badge_left = hint_x + prefix_width
    # A solid black key label separates the takeover shortcut from its sentence.
    draw.rounded_rectangle(
        (
            badge_left,
            24 + title_height,
            badge_left + shortcut_width + 15,
            31 + title_height + hint_height,
        ),
        radius=6,
        fill=(0, 0, 0, 255),
    )
    draw.text((hint_x, hint_y), hint_prefix, font=hint_font, fill=(225, 240, 255, 255))
    draw.text((badge_left + 8, hint_y), _NOTICE_SHORTCUT, font=hint_font, fill=(255, 255, 255, 255))
    draw.text(
        (badge_left + shortcut_width + 16, hint_y),
        hint_suffix,
        font=hint_font,
        fill=(225, 240, 255, 255),
    )
    return width, height, premultiplied_bgra(image, 1.0)


def _notice_glow_bitmap(
    width: int, height: int, color: tuple[int, int, int], pad: int = _NOTICE_GLOW_PAD
) -> bytes:
    """Anchor the aura at the solid start of the panel's outer fade."""
    size = (width + 2 * pad, height + 2 * pad)
    shape = Image.new("L", size)
    # The inset contour meets the panel where its eight-pixel fade begins.
    shape.paste(_notice_shape_mask(width - 16, height - 16, 14), (pad + 8, pad + 8))
    outside = ImageChops.subtract(shape.filter(ImageFilter.GaussianBlur(min(15, pad / 2))), shape)
    # Feather the inner cutoff as well, so the halo cannot end as a bright line.
    outside = outside.filter(ImageFilter.GaussianBlur(3))
    aura = Image.new("RGBA", size, (*color, 0))
    peak = outside.getextrema()[1]
    aura.putalpha(outside.point(lambda alpha: round(alpha * 211 / peak)))
    return premultiplied_bgra(aura, 1.0)


_RIPPLE_SIZE = 144


def _ripple_bitmap(progress: float, color: tuple[int, int, int]) -> bytes:
    """One frame of the click ripple: a soft ring expanding outward from the
    click point as it fades, so a click reads as a splash instead of a blink."""
    size = _RIPPLE_SIZE
    half = (size - 1) / 2
    radius = 12 + progress * (half - 18)
    band = 7.0
    pixels = []
    for y in range(size):
        for x in range(size):
            distance = math.hypot(x - half, y - half)
            ring = math.exp(-0.5 * ((distance - radius) / band) ** 2)
            alpha = round(235 * ring * (1 - progress) ** 1.2)
            pixels.append((*color, alpha))
    image = Image.new("RGBA", (size, size))
    image.putdata(pixels)
    return premultiplied_bgra(image, 1.0)


_RIPPLE_FRAMES = 12
_ripple_cache: dict[tuple[int, tuple[int, int, int]], bytes] = {}


def _ripple_frame_bgra(index: int, color: tuple[int, int, int]) -> bytes:
    """Cached ripple frame: generating a 144² glow in Python costs ~15 ms,
    which would stall the indicator loop mid-animation; twelve pre-blended
    buckets per colour turn playback into a dictionary lookup."""
    key = (index, color)
    frame = _ripple_cache.get(key)
    if frame is None:
        frame = _ripple_bitmap(index / (_RIPPLE_FRAMES - 1), color)
        _ripple_cache[key] = frame
    return frame


# Warm both palettes at import: a few hundred ms once, versus a visible
# hitch the first time a click lands.
for _index in range(_RIPPLE_FRAMES):
    _ripple_frame_bgra(_index, (45, 145, 255))
    _ripple_frame_bgra(_index, (255, 170, 55))


# --- live variant: keyboard on the left, mouse on the right ---
_NOTICE_SIDE_LEFT = 150
_NOTICE_SIDE_RIGHT = 150
_KEYS = {0x11: "Ctrl", 0x10: "Shift", 0x12: "Alt", 0x5B: "Win", 0x1B: "Esc", 0x0D: "Enter", 0x20: "Space", 0x09: "Tab", 0x08: "Backspace", 0x2E: "Del"}


def _live_key_label(code: int) -> str:
    if code in _KEYS:
        return _KEYS[code]
    if 0x30 <= code <= 0x39 or 0x41 <= code <= 0x5A:
        return chr(code)
    return ""


def _live_key_text(live: dict) -> str:
    names = [_live_key_label(int(code)) for code in (live.get("keys") or ())[-3:]]
    return " + ".join(name for name in names if name)


def _notice_bitmap_live(screen_width: int, live: dict | None = None) -> tuple[int, int, bytes] | None:
    live = live or {}
    available = screen_width - 32
    if available < 300:
        return None
    padding = 18
    font_dir = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts"
    for size in range(24, 7, -1):
        try:
            title_font = ImageFont.truetype(str(font_dir / "msyhbd.ttc"), size + 6)
            hint_font = ImageFont.truetype(str(font_dir / "msyh.ttc"), size)
            plus_font = ImageFont.truetype(str(font_dir / "msyh.ttc"), 20)
        except OSError:
            title_font = hint_font = plus_font = ImageFont.load_default()
        measure = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
        title_box = measure.textbbox((0, 0), _NOTICE_TITLE, font=title_font)
        hint_box = measure.textbbox((0, 0), _NOTICE_HINT, font=hint_font)
        text_width = max(title_box[2] - title_box[0], hint_box[2] - hint_box[0])
        width = text_width + 2 * padding + 320
        if width <= available:
            break
    else:
        return None
    height = 122
    image = Image.new("RGBA", (width, height), (8, 42, 88, 0))
    image.putalpha(_notice_panel_mask(width, height).point(lambda a: round(a * 0.85)))
    draw = ImageDraw.Draw(image)
    title_w = title_box[2] - title_box[0]
    hint_w = hint_box[2] - hint_box[0]
    center_left, center_width = 200, width - 320
    draw.text((center_left + (center_width - title_w) // 2 - title_box[0], 22 - title_box[1]), _NOTICE_TITLE, font=title_font, fill=(248, 251, 255, 255))
    draw.text((center_left + (center_width - hint_w) // 2 - hint_box[0], 66 - hint_box[1]), _NOTICE_HINT, font=hint_font, fill=(225, 240, 255, 255))

    now = time.monotonic()
    recent: list[tuple[tuple[str, ...], float]] = []
    for item in list(live.get("recent") or []):
        if isinstance(item, tuple) and len(item) == 2 and isinstance(item[0], tuple) and isinstance(item[1], (int, float)):
            chord, started = item
        else:
            chord, started = item, now
        age = now - started
        if age >= _KEY_LINGER_SECONDS:
            continue
        # 刚按下时全亮，之后线性淡出；不再按“第几条”给固定档位。
        opacity = 1.0 if age <= 0.15 else max(0.0, 1 - (age - 0.15) / (_KEY_LINGER_SECONDS - 0.15))
        recent.append((chord, opacity))
    if not recent and live.get("keys"):
        recent = [(tuple(_live_key_label(int(c)) for c in live["keys"] if _live_key_label(int(c))), 1.0)]
    recent = recent[-3:]
    rows = len(recent)
    key_height = 30
    row_gap = 6
    # 先量一遍每行宽度，整块在左侧 200px 区域里居中。
    row_layouts: list[tuple[list[tuple[Image.Image, bool]], float, int]] = []
    for chord, opacity in recent:
        glyphs: list[tuple[Image.Image, bool]] = []
        row_width = 0
        for key_index, label in enumerate(chord):
            glyph = _key_glyph(label, key_height)
            if glyph is None:
                continue
            if key_index:
                row_width += 18  # 加号位：字形居中，两侧各留一点
            glyphs.append((glyph, bool(key_index)))
            row_width += glyph.width
        row_layouts.append((glyphs, opacity, row_width))
    max_width = max((layout[2] for layout in row_layouts), default=0)
    left = max(12, (200 - max_width) // 2)
    top = height - 10 - rows * key_height - max(0, rows - 1) * row_gap
    for index, (glyphs, opacity, row_width) in enumerate(row_layouts):
        row = Image.new("RGBA", (max(1, row_width), key_height), (0, 0, 0, 0))
        rd = ImageDraw.Draw(row)
        plus_box = rd.textbbox((0, 0), "+", font=plus_font)
        plus_y = (key_height - (plus_box[3] - plus_box[1])) / 2 - plus_box[1] - 2
        x = 0
        for glyph, needs_plus in glyphs:
            if needs_plus:
                pw = rd.textlength("+", font=plus_font)
                rd.text((x + (18 - pw) / 2, plus_y), "+", font=plus_font, fill=(180, 210, 250, 230))
                x += 18
            row.alpha_composite(glyph, (x, 0))
            x += glyph.width
        row.putalpha(row.getchannel("A").point(lambda a: round(a * opacity)))
        image.alpha_composite(row, (left, top + index * (key_height + row_gap)))

    # AI 自己的点击/输入：物理钩子过滤注入事件，这里单独画一行。
    ai_rows: list[tuple[str, float]] = []
    for kind, detail, started in (live.get("ai_actions") or ()):
        age = now - started
        if age >= _KEY_LINGER_SECONDS:
            continue
        opacity = 1.0 if age <= 0.15 else max(0.0, 1 - (age - 0.15) / (_KEY_LINGER_SECONDS - 0.15))
        if kind == "type" and detail:
            ai_rows.append((f"输入 {detail}", opacity))
        elif kind == "keys" and detail:
            ai_rows.append((str(detail).replace("+", " + "), opacity))
    ai_rows = ai_rows[-3:]
    for index, (line, opacity) in enumerate(ai_rows):
        row_width = 196
        row = Image.new("RGBA", (row_width, 24), (0, 0, 0, 0))
        rd = ImageDraw.Draw(row)
        box = rd.textbbox((0, 0), line, font=hint_font)
        text_w = box[2] - box[0]
        rd.text(((row_width - text_w) // 2 - box[0], 2 - box[1]), line, font=hint_font, fill=(215, 235, 255, 240))
        row.putalpha(row.getchannel("A").point(lambda a: round(a * opacity)))
        # 左侧中部，向上挤：最新一行在最下面，旧行往上排。
        image.alpha_composite(row, (8, 138 - (len(ai_rows) - index) * 24))

    pressed = set(live.get("buttons") or ())
    button_times = live.get("button_times") or {}
    levels: dict[str, float] = {}
    for name in ("left", "middle", "right"):
        started = button_times.get(name)
        if name in pressed:
            levels[name] = 1.0
        elif isinstance(started, (int, float)):
            age = now - started
            levels[name] = 0.0 if age >= _BUTTON_LINGER_SECONDS else (
                1.0 if age <= 0.05 else max(0.0, 1 - (age - 0.05) / (_BUTTON_LINGER_SECONDS - 0.05))
            )
        else:
            levels[name] = 0.0
    glyph = _mouse_glyph(pressed, 54, 74, levels)

    # 移动方向：鼠标朝该方向轻微倾斜，0.8 秒内弹回。
    pointer = live.get("pointer")
    moving = isinstance(pointer, tuple) and len(pointer) == 3 and (now - pointer[2]) < 0.8
    if moving:
        dx, dy = float(pointer[0]), float(pointer[1])
        if abs(dx) + abs(dy) > 0.5:
            strength = 1.0 - (now - pointer[2]) / 0.8
            tilt = max(-10.0, min(10.0, dx / (abs(dx) + abs(dy) + 1e-6) * 10.0)) * strength
            if abs(tilt) > 0.2:
                glyph = glyph.rotate(tilt, resample=Image.BICUBIC, expand=False)

    gx = width - 120 + (120 - glyph.width) // 2
    gy = (height - glyph.height) // 2

    # 鼠标周围一圈淡淡的边界；朝哪边移动，就在圈内那侧亮一点蓝。
    ring_size = max(glyph.width, glyph.height) + 26
    ring = Image.new("RGBA", (ring_size, ring_size), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    cx, cy = ring_size / 2, ring_size / 2
    radius = ring_size / 2 - 3
    rd.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=(150, 200, 255, 38), width=1)
    if moving:
        dx, dy = float(pointer[0]), float(pointer[1])
        if abs(dx) + abs(dy) > 0.5:
            strength = 1.0 - (now - pointer[2]) / 0.8
            angle = math.degrees(math.atan2(dy, dx))
            rd.arc((cx - radius, cy - radius, cx + radius, cy + radius),
                   start=angle - 22, end=angle + 22,
                   fill=(140, 205, 255, round(120 * strength)), width=3)
    image.alpha_composite(ring, (gx + glyph.width // 2 - ring_size // 2, gy + glyph.height // 2 - ring_size // 2))
    image.alpha_composite(glyph, (gx, gy))
    return width, height, premultiplied_bgra(image, 1.0)


_notice_bitmap = _notice_bitmap_live


def _mouse_glyph(buttons: set, width: int = 52, height: int = 70, levels: dict[str, float] | None = None) -> Image.Image:
    """优先用应用同一套 SVG 预渲染的鼠标图；缺图时退回 PIL 几何。

    底图（m0）三键是暗色，没有常驻蓝底；按下时按 levels 叠加蓝色高亮，
    再随时间淡出。
    """
    art = Path(__file__).with_name("mouse_art") / "m0.png"
    if art.exists():
        src = Image.open(art).convert("RGBA")
        box = src.getbbox()
        if box:
            src = src.crop(box)
        canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        src.thumbnail((width, height), Image.Resampling.LANCZOS)
        ox = (width - src.width) // 2
        oy = (height - src.height) // 2
        canvas.alpha_composite(src, (ox, oy))
        levels = levels or {}
        if any(level > 0 for level in levels.values()):
            shape = canvas.getchannel("A").point(lambda a: 255 if a > 8 else 0)
            overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
            od = ImageDraw.Draw(overlay)
            zones = {
                "left": (4 / 56, 3 / 76, 22 / 56, 38 / 76),
                "middle": (22 / 56, 3 / 76, 34 / 56, 38 / 76),
                "right": (34 / 56, 3 / 76, 52 / 56, 38 / 76),
            }
            for name, (x1, y1, x2, y2) in zones.items():
                level = max(0.0, min(1.0, levels.get(name, 0.0)))
                if level <= 0:
                    continue
                od.rectangle(
                    (ox + round(x1 * src.width), oy + round(y1 * src.height),
                     ox + round(x2 * src.width), oy + round(y2 * src.height)),
                    fill=(140, 205, 255, round(255 * level)),
                )
            overlay.putalpha(ImageChops.multiply(overlay.getchannel("A"), shape))
            canvas.alpha_composite(overlay)
        d = ImageDraw.Draw(canvas)
        w = max(1, width // 42)
        x1 = ox + round(src.width * 22 / 56)
        x2 = ox + round(src.width * 34 / 56)
        y1 = oy + round(src.height * 3 / 76)
        y2 = oy + round(src.height * 38 / 76)
        d.line((x1, y1, x1, y2), fill=(150, 200, 255, 145), width=w)
        d.line((x2, y1, x2, y2), fill=(150, 200, 255, 145), width=w)
        return canvas
    s = 4
    w, h = 56 * s, 76 * s
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    def q(v):
        return int(round(v * s))

    body = (q(4), q(3), q(52), q(73))
    draw.rounded_rectangle(body, radius=q(24), fill=(10, 28, 60, 235), outline=(150, 200, 255, 220), width=max(1, q(1.4)))
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle(body, radius=q(24), fill=255)
    face = (58, 120, 210, 255)
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.rectangle((q(4), q(3), q(22), q(38)), fill=(140, 205, 255, 255) if "left" in buttons else face)
    ld.rectangle((q(34), q(3), q(52), q(38)), fill=(140, 205, 255, 255) if "right" in buttons else face)
    ld.rectangle((q(22), q(3), q(34), q(38)), fill=(140, 205, 255, 255) if "middle" in buttons else face)
    img = Image.composite(layer, img, mask)
    draw = ImageDraw.Draw(img)
    draw.line((q(4), q(38), q(52), q(38)), fill=(150, 200, 255, 120), width=max(1, q(1.2)))
    draw.line((q(22), q(3), q(22), q(38)), fill=(150, 200, 255, 170), width=max(1, q(1)))
    draw.line((q(34), q(3), q(34), q(38)), fill=(150, 200, 255, 170), width=max(1, q(1)))
    line = (235, 247, 255, 255)
    draw.line((q(25), q(15), q(28), q(11), q(31), q(15)), fill=line, width=max(1, q(1.8)))
    draw.line((q(25), q(26), q(28), q(30), q(31), q(26)), fill=line, width=max(1, q(1.8)))
    return img.resize((width, height), Image.Resampling.LANCZOS)


_KEY_GLYPH_CACHE: dict[tuple[str, int], Image.Image | None] = {}


def _key_glyph(label: str, height: int = 32) -> Image.Image | None:
    """每个键一张预渲染 SVG 键帽图；没有图时返回 None 走兜底。"""
    key = (label, height)
    if key in _KEY_GLYPH_CACHE:
        return _KEY_GLYPH_CACHE[key]
    safe = "".join(ch if ch.isalnum() else f"u{ord(ch):x}" for ch in label)
    path = Path(__file__).with_name("key_art") / f"{safe}.png"
    if not path.exists():
        _KEY_GLYPH_CACHE[key] = None
        return None
    try:
        img = Image.open(path).convert("RGBA")
    except OSError:
        _KEY_GLYPH_CACHE[key] = None
        return None
    width = max(1, round(img.width * height / img.height))
    result = img.resize((width, height), Image.Resampling.LANCZOS)
    _KEY_GLYPH_CACHE[key] = result
    return result

