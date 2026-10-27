"""Shared primitives for the report diagrams."""

from figlib import (Canvas, NAVY, NAVY_D, BLUE, INDIGO, TEAL, LIGHT, LIGHT2, BORDER,
                    GREY, DARK, WHITE, ACCENT, font)


def label(c, x, y, text, size=15, color=DARK, bold=False, italic=False, width=260):
    return c.text_box(x, y, text, size, color=color, bold=bold, italic=italic,
                      max_width=width, line_gap=1.2)


def lane(c, x, y, w, h, title, fill=(244, 247, 251), outline=BORDER):
    c.rect(x, y, w, h, fill=fill, outline=outline, width=1, radius=6)
    c.text_box(x + w / 2, y + 20, title, 15, color=NAVY_D, bold=True, max_width=w - 16)


def pill(c, x, y, w, h, text, size=14, fill=WHITE, outline=NAVY, color=NAVY_D, bold=True):
    c.rect(x, y, w, h, fill=fill, outline=outline, width=2, radius=h / 2)
    c.text_box(x + w / 2, y + h / 2, text, size, color=color, bold=bold, max_width=w - 16)


def diamond(c, cx, cy, w, h, text, size=13, fill=(255, 250, 242), outline=ACCENT, width=230):
    pts = [(cx, cy - h / 2), (cx + w / 2, cy), (cx, cy + h / 2), (cx - w / 2, cy)]
    c.d.polygon([(p[0] * 2, p[1] * 2) for p in pts], fill=fill, outline=outline, width=2 * 2)
    c.text_box(cx, cy, text, size, color=(92, 62, 30), bold=True, max_width=width, line_gap=1.15)


def start(c, cx, cy, text="Bắt đầu"):
    c.ellipse(cx, cy, 30, 16, fill=DARK, outline=DARK, width=1)
    c.text(cx + 46, cy, text, 14, color=GREY, anchor="lm")


def end(c, cx, cy, text="Kết thúc"):
    c.ellipse(cx, cy, 30, 16, fill=WHITE, outline=DARK, width=3)
    c.ellipse(cx, cy, 17, 8, fill=DARK, outline=DARK, width=1)
    c.text(cx + 46, cy, text, 14, color=GREY, anchor="lm")


def step(c, cx, cy, text, w=330, h=56, size=14, fill=LIGHT, outline=NAVY,
         color=NAVY_D, bold=False):
    c.rect(cx - w / 2, cy - h / 2, w, h, fill=fill, outline=outline, width=2, radius=6)
    c.text_box(cx, cy, text, size, color=color, bold=bold, max_width=w - 16, line_gap=1.18)


def edge(c, p1, p2, color=NAVY, width=2, dashed=False, head=9, label_text=None,
         label_pos=None, label_size=12, label_bg=WHITE, label_color=DARK):
    if label_text:
        c.arrow([p1, p2], color=color, width=width, head=head, dashed=dashed,
                label=label_text, label_pos=label_pos, label_size=label_size,
                label_bg=label_bg, label_color=label_color)
    else:
        if dashed:
            c.dashed_line(p1, p2, color=color, width=width)
            import math
            ang = math.atan2(p2[1] - p1[1], p2[0] - p1[0])
            p1h = (p2[0] - head * math.cos(ang - math.pi / 7), p2[1] - head * math.sin(ang - math.pi / 7))
            p2h = (p2[0] - head * math.cos(ang + math.pi / 7), p2[1] - head * math.sin(ang + math.pi / 7))
            c.d.polygon([(p2[0] * 2, p2[1] * 2), (p1h[0] * 2, p1h[1] * 2), (p2h[0] * 2, p2h[1] * 2)], fill=color)
        else:
            c.arrow([p1, p2], color=color, width=width, head=head)


def elbow(c, pts, color=NAVY, width=2, dashed=False, head=9, label_text=None, label_pos=None,
          label_size=12):
    c.arrow(pts, color=color, width=width, head=head, dashed=dashed,
            label=label_text, label_pos=label_pos, label_size=label_size)


def actor_note(c, cx, cy, title, sub=None, w=230, h=74, fill=(247, 249, 252), outline=BLUE):
    c.rect(cx - w / 2, cy - h / 2, w, h, fill=fill, outline=outline, width=2, radius=8)
    c.text_box(cx, cy - (11 if sub else 0), title, 15, color=NAVY_D, bold=True, max_width=w - 16)
    if sub:
        c.text_box(cx, cy + 17, sub, 12, color=GREY, max_width=w - 16)


def footer(c, text, y=None, x=40):
    c.text(x, y if y is not None else c.h - 34, text, 13, color=GREY, italic=True)


def uml_uc(c, cx, cy, text, rx=120, ry=38, size=13.5, fill=WHITE, outline=NAVY,
           color=NAVY_D, bold=False, dashed=False):
    c.ellipse(cx, cy, rx, ry, fill=fill, outline=outline, width=2)
    if dashed:
        c.dashed_rect(cx - rx, cy - ry, rx * 2, ry * 2, color=outline, width=1, dash=5, gap=4)
    c.text_box(cx, cy, text, size, color=color, bold=bold, max_width=rx * 2 - 14, line_gap=1.13)


def relation(c, p1, p2, text="", dashed=True, color=NAVY, lx=None, ly=None):
    c.arrow([p1, p2], color=color, width=1.5, head=7, dashed=dashed,
            label=("«" + text + "»") if text else None,
            label_pos=(lx, ly) if lx is not None else None, label_size=11.5)


def cardinality(c, x, y, text, color=ACCENT):
    c.text_box(x, y, text, 13, color=color, bold=True, bg=WHITE, max_width=30)


def seq_participants(c, specs, y=38, h=62):
    """specs: list of (cx, width, title, subtitle). Draw header boxes + lifelines."""
    for cx, w, title, sub in specs:
        c.rect(cx - w / 2, y, w, h, fill=(240, 245, 251), outline=NAVY, width=2, radius=6)
        c.text_box(cx, y + (22 if sub else h / 2), title, 13.5, color=NAVY_D, bold=True,
                   max_width=w - 14)
        if sub:
            c.text_box(cx, y + 45, sub, 10.5, color=GREY, max_width=w - 14)
        c.dashed_line((cx, y + h), (cx, c.h - 54), color=GREY, width=1.2, dash=7, gap=6)


def seq_msg(c, x1, x2, y, text, dashed=False, color=NAVY, label_color=DARK,
            label_size=11.5, label_offset=-15, max_width=None):
    c.arrow([(x1, y), (x2, y)], color=color, width=1.6, head=8, dashed=dashed)
    gap = abs(x2 - x1)
    mw = max_width or max(120, gap - 34)
    c.text_box((x1 + x2) / 2, y + label_offset, text, label_size, color=label_color,
               bg=WHITE, max_width=mw, line_gap=1.12)


def seq_self(c, x, y1, y2, text, color=NAVY, width=175, align="left"):
    """Self-call loop to the right of a lifeline."""
    c.arrow([(x, y1), (x + 34, y1), (x + 34, y2), (x, y2)], color=color, width=1.4, head=7)
    if align == "left":
        c.text_box(x + 52, (y1 + y2) / 2, text, 11.5, color=DARK, bg=WHITE,
                   align="left", max_width=width, line_gap=1.12)
    else:
        c.text_box(x + 42 + width / 2, (y1 + y2) / 2, text, 11.5, color=DARK, bg=WHITE,
                   max_width=width, line_gap=1.12)


def seq_note(c, x, y, w, h, text, size=12, fill=(255, 249, 229),
             outline=(198, 164, 84), color=(92, 70, 22)):
    c.rect(x, y, w, h, fill=fill, outline=outline, width=1.5, radius=4)
    c.text_box(x + w / 2, y + h / 2, text, size, color=color, max_width=w - 18, line_gap=1.25)


def seq_frame(c, x, y, w, h, label, color=(137, 121, 168)):
    c.dashed_rect(x, y, w, h, color=color, width=1.5, dash=7, gap=5)
    c.rect(x, y, 74, 24, fill=color, outline=color, width=1, radius=3)
    c.text_box(x + 37, y + 12, label, 11.5, color=WHITE, bold=True, max_width=68)


def legend_card(c, x, y, w, items, title="Chú thích", row_h=28, size=12):
    h = 34 + row_h * len(items)
    c.rect(x, y, w, h, fill=(250, 251, 253), outline=BORDER, width=1.5, radius=6)
    c.text_box(x + w / 2, y + 18, title, 12.5, color=NAVY_D, bold=True, max_width=w - 16)
    for i, (kind, fill, outline, text) in enumerate(items):
        yy = y + 40 + i * row_h
        if kind == "box":
            c.rect(x + 14, yy - 9, 24, 18, fill=fill, outline=outline, width=1.5, radius=3)
        elif kind == "diamond":
            pts = [(x + 26, yy - 10), (x + 37, yy), (x + 26, yy + 10), (x + 15, yy)]
            c.d.polygon([(p[0] * 2, p[1] * 2) for p in pts], fill=fill, outline=outline, width=3)
        elif kind == "line":
            c.line((x + 14, yy), (x + 38, yy), color=outline, width=2)
        elif kind == "dash":
            c.dashed_line((x + 14, yy), (x + 38, yy), color=outline, width=2, dash=5, gap=4)
        c.text(x + 48, yy, text, size, color=DARK, anchor="lm")
    return h

