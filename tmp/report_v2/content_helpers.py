# -*- coding: utf-8 -*-
"""Shared builders for report content blocks."""


class Tables:
    def __init__(self, chapter):
        self.chapter = chapter
        self.n = 0

    def caption(self, text):
        self.n += 1
        return f"Bảng {self.chapter}.{self.n} - {text}"


def tbl(caption, cols, rows, widths=None, font=10.5, landscape=False):
    return ("tbl", {
        "caption": caption,
        "cols": cols,
        "rows": rows,
        "widths": widths,
        "font": font,
        "landscape": landscape,
    })


def fig(filename, caption, width=16.0, landscape=False):
    return ("fig", (filename, caption, width, landscape))


def uc_block(caps, code, name, primary, secondary, goal, pre, post, trigger,
             alt, nfr, flow, stories):
    """One UC: 11-field description table + main-flow table + user stories."""
    fields = [
        ("Mã use case", code),
        ("Tên use case", name),
        ("Actor chính", primary),
        ("Actor phụ", secondary),
        ("Mục tiêu", goal),
        ("Tiền điều kiện", pre),
        ("Hậu điều kiện", post),
        ("Sự kiện kích hoạt", trigger),
        ("Luồng chính", "Bảng bước bên dưới."),
        ("Luồng thay thế / ngoại lệ", alt),
        ("Yêu cầu phi chức năng", nfr),
    ]
    blocks = [
        ("h3", f"{code} - {name}"),
        tbl(caps.caption(f"Mô tả use case {code} - {name}"),
            ["Trường", "Nội dung"], fields, [3.4, 12.6], font=10.5),
        tbl(caps.caption(f"Luồng chính {code}"),
            ["Bước", "Hành động của tác nhân", "Phản hồi của hệ thống"],
            flow, [1.1, 6.8, 8.1], font=10.5),
        ("us", (code, stories)),
    ]
    return blocks


def cat(*parts):
    out = []
    for p in parts:
        if isinstance(p, list):
            out.extend(p)
        else:
            out.append(p)
    return out
