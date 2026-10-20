"""Minimal drawing toolkit used to render the report diagrams with Pillow.

Everything is drawn at 2x and saved at 300 dpi so the figures stay sharp when
they are scaled to the 16 cm text width of the Word document.
"""

import math
import os
from PIL import Image, ImageDraw, ImageFont

S = 2  # supersample factor
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "figures")
os.makedirs(OUT, exist_ok=True)

NAVY = (31, 58, 95)
NAVY_D = (22, 42, 71)
BLUE = (46, 94, 140)
INDIGO = (86, 76, 122)
TEAL = (15, 76, 92)
LIGHT = (238, 243, 248)
LIGHT2 = (247, 249, 252)
BORDER = (150, 165, 185)
GREY = (95, 105, 120)
DARK = (32, 38, 48)
WHITE = (255, 255, 255)
ACCENT = (176, 108, 48)

_FONT_DIRS = ["C:/Windows/Fonts", "/usr/share/fonts/truetype/dejavu"]
_FONT_FILES = {
    (False, False): ["arial.ttf", "DejaVuSans.ttf"],
    (True, False): ["arialbd.ttf", "DejaVuSans-Bold.ttf"],
    (False, True): ["ariali.ttf", "DejaVuSans-Oblique.ttf"],
    (True, True): ["arialbi.ttf", "DejaVuSans-BoldOblique.ttf"],
}

_cache = {}


def font(size, bold=False, italic=False):
    key = (size, bold, italic)
    if key in _cache:
        return _cache[key]
    for name in _FONT_FILES[(bold, italic)]:
        for d in _FONT_DIRS:
            path = os.path.join(d, name)
            if os.path.exists(path):
                f = ImageFont.truetype(path, size * S)
                _cache[key] = f
                return f
    f = ImageFont.load_default()
    _cache[key] = f
    return f


class Canvas:
    def __init__(self, w, h, bg=WHITE):
        self.w, self.h = w, h
        self.img = Image.new("RGB", (w * S, h * S), bg)
        self.d = ImageDraw.Draw(self.img)
        self.warnings = []

    # ---------- primitives ----------
    def _p(self, xy):
        return [xy[0] * S, xy[1] * S]

    def rect(self, x, y, w, h, fill=None, outline=BORDER, width=2, radius=0):
        box = [x * S, y * S, (x + w) * S, (y + h) * S]
        if radius:
            if fill:
                self.d.rounded_rectangle(box, radius=radius * S, fill=fill, outline=outline, width=width * S)
            else:
                self.d.rounded_rectangle(box, radius=radius * S, outline=outline, width=width * S)
        else:
            if fill:
                self.d.rectangle(box, fill=fill, outline=outline, width=width * S)
            else:
                self.d.rectangle(box, outline=outline, width=width * S)

    def dashed_rect(self, x, y, w, h, color=NAVY, width=2, dash=8, gap=6):
        pts = [(x, y), (x + w, y), (x + w, y + h), (x, y + h), (x, y)]
        for i in range(len(pts) - 1):
            self.dashed_line(pts[i], pts[i + 1], color=color, width=width, dash=dash, gap=gap)

    def ellipse(self, cx, cy, rx, ry, fill=None, outline=NAVY, width=2):
        box = [(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S]
        if fill:
            self.d.ellipse(box, fill=fill, outline=outline, width=width * S)
        else:
            self.d.ellipse(box, outline=outline, width=width * S)

    def line(self, p1, p2, color=GREY, width=2):
        self.d.line([p1[0] * S, p1[1] * S, p2[0] * S, p2[1] * S], fill=color,
                    width=max(1, int(round(width * S))))

    def dashed_line(self, p1, p2, color=GREY, width=2, dash=8, gap=6):
        x1, y1 = p1
        x2, y2 = p2
        length = math.hypot(x2 - x1, y2 - y1)
        if length == 0:
            return
        ux, uy = (x2 - x1) / length, (y2 - y1) / length
        pos = 0
        while pos < length:
            end = min(pos + dash, length)
            self.line((x1 + ux * pos, y1 + uy * pos), (x1 + ux * end, y1 + uy * end), color, width)
            pos = end + gap

    def arrow(self, pts, color=NAVY, width=2, head=9, dashed=False, label=None,
              label_pos=None, label_size=17, label_color=None, label_bg=WHITE):
        pts = [tuple(p) for p in pts]
        for i in range(len(pts) - 1):
            if dashed:
                self.dashed_line(pts[i], pts[i + 1], color, width)
            else:
                self.line(pts[i], pts[i + 1], color, width)
        # arrow head on the last segment
        (x1, y1), (x2, y2) = pts[-2], pts[-1]
        ang = math.atan2(y2 - y1, x2 - x1)
        a = head
        p1 = (x2 - a * math.cos(ang - math.pi / 7), y2 - a * math.sin(ang - math.pi / 7))
        p2 = (x2 - a * math.cos(ang + math.pi / 7), y2 - a * math.sin(ang + math.pi / 7))
        self.d.polygon([self._p((x2, y2)), self._p(p1), self._p(p2)], fill=color)
        if label:
            if label_pos is None:
                mx = sum(p[0] for p in pts) / len(pts)
                my = sum(p[1] for p in pts) / len(pts)
                label_pos = (mx, my)
            self.text_box(label_pos[0], label_pos[1], label, label_size,
                          color=label_color or DARK, bg=label_bg, align="center")

    def text(self, x, y, s, size=20, color=DARK, bold=False, italic=False, anchor="la"):
        self.d.text((x * S, y * S), s, font=font(size, bold, italic), fill=color, anchor=anchor)

    def wrap(self, s, width, size=20, bold=False, italic=False):
        f = font(size, bold, italic)
        words = str(s).split()
        if not words:
            return [""]
        lines, cur = [], words[0]
        for w in words[1:]:
            trial = cur + " " + w
            if self.d.textlength(trial, font=f) / S <= width:
                cur = trial
            else:
                lines.append(cur)
                cur = w
        lines.append(cur)
        return lines

    def text_box(self, cx, cy, s, size=20, color=DARK, bold=False, italic=False,
                 bg=None, pad=4, align="center", max_width=None, line_gap=1.25):
        """Draw centred (or left aligned) text with optional background."""
        width = max_width if max_width else 600
        lines = self.wrap(s, width, size, bold, italic)
        lh = size * line_gap
        total = lh * len(lines)
        top = cy - total / 2 + lh / 2
        for i, ln in enumerate(lines):
            y = top + i * lh
            f = font(size, bold, italic)
            tw = self.d.textlength(ln, font=f) / S
            x = cx if align == "center" else cx - width / 2
            anchor = "mm" if align == "center" else "lm"
            if bg:
                bx0 = x - tw / 2 - pad if align == "center" else x - pad
                by0 = y - size * 0.75
                self.d.rectangle([bx0 * S, by0 * S, (bx0 + tw + 2 * pad) * S, (y + size * 0.75) * S], fill=bg)
            self.d.text((x * S, y * S), ln, font=f, fill=color, anchor=anchor)
        return total

    def box(self, x, y, w, h, text, size=20, fill=LIGHT, outline=NAVY, color=NAVY_D,
            bold=True, radius=8, width=2, italic=False, align="center"):
        self.rect(x, y, w, h, fill=fill, outline=outline, width=width, radius=radius)
        self.text_box(x + w / 2 if align == "center" else x + 10, y + h / 2, text, size,
                      color=color, bold=bold, italic=italic, max_width=w - 20)
        # fit warning
        lines = self.wrap(text, w - 20, size, bold, italic)
        if len(lines) * size * 1.25 > h - 8:
            self.warnings.append(f"text may overflow box: {text[:40]!r}")

    def actor(self, cx, cy, name, size=19, color=NAVY, label_size=17):
        """Simple UML stick figure with a label under it."""
        r = 12
        self.ellipse(cx, cy - 34, r, r, fill=WHITE, outline=color, width=2)
        self.line((cx, cy - 22), (cx, cy + 4), color, 2)
        self.line((cx - 20, cy - 12), (cx + 20, cy - 12), color, 2)
        self.line((cx, cy + 4), (cx - 16, cy + 28), color, 2)
        self.line((cx, cy + 4), (cx + 16, cy + 28), color, 2)
        self.text_box(cx, cy + 44, name, label_size, color=color, bold=True, max_width=170)

    def save(self, name, note=None):
        path = os.path.join(OUT, name)
        self.img.save(path, dpi=(300, 300))
        if self.warnings:
            print(f"  [{name}] WARNINGS:")
            for w in dict.fromkeys(self.warnings):
                print("    -", w)
        print(f"  {name}  {self.w}x{self.h}")
        return path


# ---------- reusable composites ----------

def erd_entity(c, x, y, w, title, rows, h=None):
    """Entity box with a header band and field rows (PK/FK markers included)."""
    row_h = 19
    h = h or (30 + row_h * len(rows) + 6)
    c.rect(x, y, w, h, fill=WHITE, outline=BORDER, width=2, radius=4)
    c.rect(x, y, w, 30, fill=NAVY, outline=NAVY, width=1, radius=4)
    c.text_box(x + w / 2, y + 15, title, 17, color=WHITE, bold=True, max_width=w - 8)
    for i, row in enumerate(rows):
        yy = y + 30 + i * row_h
        marker, name = row
        if marker:
            c.text(x + 7, yy + row_h / 2, marker, 13, color=ACCENT, bold=True, anchor="lm")
        c.text(x + 34, yy + row_h / 2, name, 14, color=DARK, anchor="lm")
    return (x, y, w, h)


def card(c, x, y, w, h, title=None, fill=LIGHT, outline=NAVY):
    c.rect(x, y, w, h, fill=fill, outline=outline, width=2, radius=6)
    if title:
        c.text_box(x + w / 2, y + 18, title, 18, color=NAVY_D, bold=True, max_width=w - 12)


def bullet_lines(c, x, y, items, width=240, size=16, gap=6, color=DARK):
    yy = y
    for it in items:
        lines = c.wrap(it, width, size)
        c.text(x, yy + 8, "•", size + 2, color=NAVY, bold=True, anchor="lm")
        for i, ln in enumerate(lines):
            c.text(x + 12, yy + 8 + i * size * 1.3, ln, size, color=color, anchor="lm")
        yy += len(lines) * size * 1.3 + gap
    return yy
