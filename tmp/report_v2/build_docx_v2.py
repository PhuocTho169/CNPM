# -*- coding: utf-8 -*-
"""Render the report to .docx with python-docx."""

import os
import sys

from docx import Document
from docx.enum.section import WD_ORIENT, WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT, WD_ROW_HEIGHT_RULE
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import content_front as F
import content_ch1 as C1
import content_ch2 as C2
import content_ch3 as C3
import content_ch4 as C4
import content_ch5 as C5
import content_appendix as A

HERE = os.path.dirname(os.path.abspath(__file__))
FIG = os.path.join(HERE, "figures")
OUT_PATH = os.path.join(HERE, "..", "..", "BaoCao_DoAn_HeThong_AmThuc_DaNgonNgu_Quan4.docx")

NAVY = RGBColor(0x1F, 0x3A, 0x5F)
GREY = RGBColor(0x55, 0x5F, 0x6D)
DARK = RGBColor(0x20, 0x26, 0x30)

BODY_FONT = "Times New Roman"
CODE_FONT = "Consolas"

CONTENT_W = 16.0      # cm, portrait text width
CONTENT_W_LAND = 25.7  # cm, landscape text width (2 cm margins)

BODY_BLOCKS = C1.CH1 + C2.CH2 + C3.CH3 + C4.CH4 + C5.CH5 + A.REFERENCES + A.APPENDIX


# ----------------------------------------------------------------- helpers
def set_run_font(run, name=BODY_FONT, size=None, bold=None, italic=None, color=None):
    run.font.name = name
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.append(rfonts)
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rfonts.set(qn(attr), name)
    if size is not None:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic
    if color is not None:
        run.font.color.rgb = color


def shade(paragraph_or_cell, hex_fill):
    el = paragraph_or_cell._element
    pr = el.get_or_add_pPr() if hasattr(el, "get_or_add_pPr") else el.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_fill)
    pr.append(shd)


def paragraph_border(paragraph, color="1F3A5F", size=12, side="left", space=8):
    pPr = paragraph._p.get_or_add_pPr()
    pbdr = OxmlElement("w:pBdr")
    el = OxmlElement(f"w:{side}")
    el.set(qn("w:val"), "single")
    el.set(qn("w:sz"), str(size))
    el.set(qn("w:space"), str(space))
    el.set(qn("w:color"), color)
    pbdr.append(el)
    pPr.append(pbdr)


def keep_with_next(paragraph, value=True):
    paragraph.paragraph_format.keep_with_next = value


def add_field(paragraph, instr, placeholder="1", style_size=11):
    run = paragraph.add_run()
    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    run._r.append(fld_begin)

    run2 = paragraph.add_run()
    instr_el = OxmlElement("w:instrText")
    instr_el.set(qn("xml:space"), "preserve")
    instr_el.text = f" {instr} "
    run2._r.append(instr_el)

    run3 = paragraph.add_run()
    fld_sep = OxmlElement("w:fldChar")
    fld_sep.set(qn("w:fldCharType"), "separate")
    run3._r.append(fld_sep)

    run4 = paragraph.add_run(placeholder)
    set_run_font(run4, size=style_size)

    run5 = paragraph.add_run()
    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")
    run5._r.append(fld_end)


def set_page_numbering(section, fmt, start=None):
    sectPr = section._sectPr
    pg = sectPr.find(qn("w:pgNumType"))
    if pg is None:
        pg = OxmlElement("w:pgNumType")
        docgrid = sectPr.find(qn("w:docGrid"))
        if docgrid is not None:
            docgrid.addprevious(pg)
        else:
            sectPr.append(pg)
    pg.set(qn("w:fmt"), fmt)
    if start is not None:
        pg.set(qn("w:start"), str(start))


def clear_page_numbering(section):
    """Drop an inherited pgNumType so the section continues the previous count.

    doc.add_section() clones the previous sectPr, including pgNumType; keeping it
    would restart the printed page number at 1 on every orientation switch.
    """
    sectPr = section._sectPr
    pg = sectPr.find(qn("w:pgNumType"))
    if pg is not None:
        sectPr.remove(pg)


def set_vertical_alignment(section, val):
    """Centre the figure block on landscape sheets instead of top-aligning it.

    doc.add_section() clones the previous sectPr, so the value must be reset to
    top when returning to portrait.
    """
    sectPr = section._sectPr
    el = sectPr.find(qn("w:vAlign"))
    if el is None:
        el = OxmlElement("w:vAlign")
        sectPr.append(el)
    el.set(qn("w:val"), val)


def compact_section_break(doc):
    """Shrink the empty paragraph that carries a section break.

    python-docx appends a blank 13 pt / 1.5-spaced paragraph for every
    add_section(). Read at Normal metrics it is ~1 cm tall and sits inside the
    section that just ended, which can push a full-height figure page over the
    17 cm landscape text height and create a blank sheet.
    """
    paragraphs = doc.element.body.findall(qn("w:p"))
    if not paragraphs:
        return
    p = paragraphs[-1]
    pPr = p.find(qn("w:pPr"))
    if pPr is None or pPr.find(qn("w:sectPr")) is None:
        return
    spacing = pPr.find(qn("w:spacing"))
    if spacing is None:
        spacing = OxmlElement("w:spacing")
        pPr.append(spacing)
    spacing.set(qn("w:before"), "0")
    spacing.set(qn("w:after"), "0")
    spacing.set(qn("w:line"), "240")
    spacing.set(qn("w:lineRule"), "auto")
    rPr = pPr.find(qn("w:rPr"))
    if rPr is None:
        rPr = OxmlElement("w:rPr")
        pPr.append(rPr)
    for tag in ("w:sz", "w:szCs"):
        el = rPr.find(qn(tag))
        if el is None:
            el = OxmlElement(tag)
            rPr.append(el)
        el.set(qn("w:val"), "2")


def add_page_footer(section, size=11):
    section.footer.is_linked_to_previous = False
    p = section.footer.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    add_field(p, "PAGE", "1", size)
    for r in p.runs:
        set_run_font(r, size=size, color=GREY)


def clear_footer(section):
    section.footer.is_linked_to_previous = False
    for p in section.footer.paragraphs:
        for r in list(p.runs):
            r._r.getparent().remove(r._r)


def set_cell_margins(table, left=0.12, right=0.12, top=0.04, bottom=0.04):
    tblPr = table._tbl.tblPr
    mar = OxmlElement("w:tblCellMar")
    for side, val in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        el = OxmlElement(f"w:{side}")
        el.set(qn("w:w"), str(int(val * 567)))
        el.set(qn("w:type"), "dxa")
        mar.append(el)
    tblPr.append(mar)


def set_fixed_layout(table):
    tblPr = table._tbl.tblPr
    layout = OxmlElement("w:tblLayout")
    layout.set(qn("w:type"), "fixed")
    tblPr.append(layout)


def repeat_header(row):
    trPr = row._tr.get_or_add_trPr()
    el = OxmlElement("w:tblHeader")
    el.set(qn("w:val"), "true")
    trPr.append(el)


def no_split(row):
    trPr = row._tr.get_or_add_trPr()
    el = OxmlElement("w:cantSplit")
    el.set(qn("w:val"), "true")
    trPr.append(el)


# ----------------------------------------------------------------- XML order fix
# python-docx inserters keep the schema order for the properties they own, but the
# helpers above append w:shd / w:pBdr / w:tblLayout / w:tblCellMar / w:rFonts
# directly. CT_PPr, CT_TblPr, CT_TrPr, CT_TcPr, CT_RPr and CT_SectPr are xsd
# sequences, so a wrong order can make Word report the file as unreadable. These
# lists are the ECMA-376 order; children are re-sorted (stably) before saving.
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
ORDER = {
    "pPr": ["pStyle", "keepNext", "keepLines", "pageBreakBefore", "framePr", "widowControl",
            "numPr", "suppressLineNumbers", "pBdr", "shd", "tabs", "suppressAutoHyphens",
            "kinsoku", "wordWrap", "overflowPunct", "topLinePunct", "autoSpaceDE",
            "autoSpaceDN", "bidi", "adjustRightInd", "snapToGrid", "spacing", "ind",
            "contextualSpacing", "mirrorIndents", "suppressOverlap", "jc", "textDirection",
            "textAlignment", "textboxTightWrap", "outlineLvl", "divId", "cnfStyle", "rPr",
            "sectPr", "pPrChange"],
    "rPr": ["rStyle", "rFonts", "b", "bCs", "i", "iCs", "caps", "smallCaps", "strike",
            "dstrike", "outline", "shadow", "emboss", "imprint", "noProof", "snapToGrid",
            "vanish", "webHidden", "color", "spacing", "w", "kern", "position", "sz",
            "szCs", "highlight", "u", "effect", "bdr", "shd", "fitText", "vertAlign",
            "rtl", "cs", "em", "lang", "eastAsianLayout", "specVanish", "oMath"],
    "tblPr": ["tblStyle", "tblpPr", "tblOverlap", "bidiVisual", "tblStyleRowBandSize",
              "tblStyleColBandSize", "tblW", "jc", "tblCellSpacing", "tblInd", "tblBorders",
              "shd", "tblLayout", "tblCellMar", "tblLook", "tblCaption", "tblDescription",
              "tblPrChange"],
    "trPr": ["cnfStyle", "divId", "gridBefore", "gridAfter", "wBefore", "wAfter", "cantSplit",
             "trHeight", "tblHeader", "tblCellSpacing", "jc", "hidden", "ins", "del",
             "trPrChange"],
    "tcPr": ["cnfStyle", "tcW", "gridSpan", "hMerge", "vMerge", "tcBorders", "shd", "noWrap",
             "tcMar", "textDirection", "tcFitText", "vAlign", "hideMark", "headers",
             "cellIns", "cellDel", "cellMerge", "tcPrChange"],
    "sectPr": ["headerReference", "footerReference", "footnotePr", "endnotePr", "type", "pgSz",
               "pgMar", "paperSrc", "pgBorders", "lnNumType", "pgNumType", "cols", "formProt",
               "vAlign", "noEndnote", "titlePg", "textDirection", "bidi", "rtlGutter",
               "docGrid", "printerSettings", "sectPrChange"],
}


def normalize_xml_order(part_element):
    for name, order in ORDER.items():
        index = {n: i for i, n in enumerate(order)}
        for el in part_element.iter(W + name):
            children = list(el)
            ordered = sorted(
                enumerate(children),
                key=lambda pair: (index.get(pair[1].tag.split("}")[-1], len(order)), pair[0]),
            )
            if [c for _, c in ordered] != children:
                for child in children:
                    el.remove(child)
                for _, child in ordered:
                    el.append(child)


# ----------------------------------------------------------------- document setup
def setup_document():
    doc = Document()

    normal = doc.styles["Normal"]
    normal.font.name = BODY_FONT
    normal.font.size = Pt(13)
    rpr = normal.element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.append(rfonts)
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rfonts.set(qn(attr), BODY_FONT)
    pf = normal.paragraph_format
    pf.line_spacing = 1.5
    pf.space_before = Pt(0)
    pf.space_after = Pt(6)
    pf.first_line_indent = Cm(1.0)
    pf.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    h1 = doc.styles["Heading 1"]
    h1.font.name = BODY_FONT
    h1.font.size = Pt(16)
    h1.font.bold = True
    h1.font.color.rgb = NAVY
    h1.paragraph_format.space_before = Pt(6)
    h1.paragraph_format.space_after = Pt(14)
    h1.paragraph_format.line_spacing = 1.2
    h1.paragraph_format.keep_with_next = True
    h1.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    h1.paragraph_format.first_line_indent = Cm(0)

    h2 = doc.styles["Heading 2"]
    h2.font.name = BODY_FONT
    h2.font.size = Pt(14)
    h2.font.bold = True
    h2.font.color.rgb = NAVY
    h2.paragraph_format.space_before = Pt(16)
    h2.paragraph_format.space_after = Pt(6)
    h2.paragraph_format.line_spacing = 1.25
    h2.paragraph_format.keep_with_next = True
    h2.paragraph_format.first_line_indent = Cm(0)

    h3 = doc.styles["Heading 3"]
    h3.font.name = BODY_FONT
    h3.font.size = Pt(13)
    h3.font.bold = True
    h3.font.color.rgb = DARK
    h3.paragraph_format.space_before = Pt(12)
    h3.paragraph_format.space_after = Pt(4)
    h3.paragraph_format.line_spacing = 1.25
    h3.paragraph_format.keep_with_next = True
    h3.paragraph_format.first_line_indent = Cm(0)

    for s in ("Heading 1", "Heading 2", "Heading 3"):
        rpr = doc.styles[s].element.get_or_add_rPr()
        rf = rpr.find(qn("w:rFonts"))
        if rf is None:
            rf = OxmlElement("w:rFonts")
            rpr.append(rf)
        for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
            rf.set(qn(attr), BODY_FONT)

    for name in ("List Bullet", "List Number"):
        st = doc.styles[name]
        st.font.name = BODY_FONT
        st.font.size = Pt(13)
        st.paragraph_format.line_spacing = 1.4
        st.paragraph_format.space_after = Pt(3)
        st.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    sec = doc.sections[0]
    sec.page_width = Cm(21)
    sec.page_height = Cm(29.7)
    sec.left_margin = Cm(3)
    sec.right_margin = Cm(2)
    sec.top_margin = Cm(2)
    sec.bottom_margin = Cm(2)
    sec.header_distance = Cm(1.2)
    sec.footer_distance = Cm(1.2)
    return doc


# ----------------------------------------------------------------- builders
def add_cover(doc):
    def line(text, size=13, bold=False, italic=False, space=6, color=DARK):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.first_line_indent = Cm(0)
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(space)
        r = p.add_run(text)
        set_run_font(r, size=size, bold=bold, italic=italic, color=color)
        return p

    line(F.SCHOOL, 12.5, bold=True, space=2)
    line(F.UNIVERSITY, 17, bold=True, color=NAVY, space=2)
    line(F.COURSE, 13, space=36)
    line("BÁO CÁO ĐỒ ÁN", 15, bold=True, space=22)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.first_line_indent = Cm(0)
    p.paragraph_format.line_spacing = 1.25
    p.paragraph_format.space_after = Pt(6)
    r = p.add_run(F.TITLE)
    set_run_font(r, size=21, bold=True, color=NAVY)

    line(F.TITLE_EN, 12.5, italic=True, color=GREY, space=4)
    line(F.SUBTITLE, 12, color=GREY, space=34)

    rows = [("Giảng viên hướng dẫn", F.INSTRUCTOR, "")]
    for name, mssv in F.STUDENTS:
        rows.append(("Sinh viên thực hiện", name, mssv))

    table = doc.add_table(rows=0, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    for label, value, mssv in rows:
        cells = table.add_row().cells
        for cell, width in zip(cells, (5.2, 6.6, 3.8)):
            cell.width = Cm(width)
        for cell, text, bold in ((cells[0], label, True),
                                 (cells[1], value, False),
                                 (cells[2], mssv, False)):
            para = cell.paragraphs[0]
            para.paragraph_format.first_line_indent = Cm(0)
            para.paragraph_format.line_spacing = 1.3
            para.paragraph_format.space_after = Pt(5)
            run = para.add_run(text)
            set_run_font(run, size=13, bold=bold)

    for _ in range(4):
        spacer = doc.add_paragraph()
        spacer.paragraph_format.space_after = Pt(0)
    line(F.PLACE_YEAR, 12.5, italic=True, color=GREY, space=0)


def add_front_matter(doc, figures, tables):
    h = doc.add_paragraph()
    h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    h.paragraph_format.first_line_indent = Cm(0)
    h.paragraph_format.space_after = Pt(14)
    r = h.add_run("MỤC LỤC")
    set_run_font(r, size=16, bold=True, color=NAVY)

    p = doc.add_paragraph()
    p.paragraph_format.first_line_indent = Cm(0)
    p.paragraph_format.line_spacing = 1.3
    add_field(p, 'TOC \\o "1-3" \\h \\z \\u', "Nhấn chuột phải vào đây và chọn Update Field để hiển thị mục lục.")

    note = doc.add_paragraph()
    note.paragraph_format.first_line_indent = Cm(0)
    note.paragraph_format.space_before = Pt(10)
    r = note.add_run("Ghi chú: mục lục được tạo bằng trường TOC của Word. Sau khi mở tệp, nhấn Ctrl+A rồi F9 (hoặc chuột phải → Update Field) để Word tính lại số trang.")
    set_run_font(r, size=11, italic=True, color=GREY)

    doc.add_page_break()

    h = doc.add_paragraph()
    h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    h.paragraph_format.first_line_indent = Cm(0)
    h.paragraph_format.space_after = Pt(10)
    r = h.add_run("DANH MỤC TỪ VIẾT TẮT")
    set_run_font(r, size=16, bold=True, color=NAVY)

    abbr = [
        ("AC", "Acceptance Criteria – tiêu chí chấp nhận (dạng Given–When–Then)"),
        ("API", "Application Programming Interface – giao diện lập trình ứng dụng"),
        ("BCP-47", "Mã định danh ngôn ngữ theo chuẩn Best Current Practice 47"),
        ("BR", "Business Rule – quy tắc nghiệp vụ"),
        ("CRUD", "Create, Read, Update, Delete"),
        ("CSDL", "Cơ sở dữ liệu"),
        ("ERD", "Entity–Relationship Diagram – sơ đồ thực thể liên kết"),
        ("FK / PK", "Foreign Key / Primary Key – khoá ngoại / khoá chính"),
        ("FR", "Functional Requirement – yêu cầu chức năng"),
        ("GPS", "Global Positioning System – hệ thống định vị toàn cầu"),
        ("JSON", "JavaScript Object Notation"),
        ("JWT", "JSON Web Token"),
        ("NFR", "Non-functional Requirement – yêu cầu phi chức năng"),
        ("QR", "Quick Response – mã phản hồi nhanh"),
        ("REST", "Representational State Transfer"),
        ("TC", "Test Case – trường hợp kiểm thử"),
        ("TTS", "Text-to-Speech – chuyển văn bản thành giọng nói"),
        ("UC", "Use Case – trường hợp sử dụng"),
        ("US", "User Story – câu chuyện người dùng"),
        ("UML", "Unified Modeling Language"),
        ("URL", "Uniform Resource Locator"),
    ]
    t = doc.add_table(rows=1, cols=2)
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    set_fixed_layout(t)
    set_cell_margins(t)
    hdr = t.rows[0]
    repeat_header(hdr)
    for cell, text, w in zip(hdr.cells, ["Từ viết tắt", "Diễn giải"], [4.0, 12.0]):
        cell.width = Cm(w)
        para = cell.paragraphs[0]
        para.paragraph_format.first_line_indent = Cm(0)
        para.paragraph_format.line_spacing = 1.15
        run = para.add_run(text)
        set_run_font(run, size=11, bold=True, color=RGBColor(0xFF, 0xFF, 0xFF))
        shade(cell, "1F3A5F")
    for a, b in abbr:
        cells = t.add_row().cells
        for cell, text, w, bold in ((cells[0], a, 4.0, True), (cells[1], b, 12.0, False)):
            cell.width = Cm(w)
            para = cell.paragraphs[0]
            para.paragraph_format.first_line_indent = Cm(0)
            para.paragraph_format.line_spacing = 1.15
            run = para.add_run(text)
            set_run_font(run, size=11, bold=bold)

    doc.add_page_break()

    h = doc.add_paragraph()
    h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    h.paragraph_format.first_line_indent = Cm(0)
    h.paragraph_format.space_after = Pt(8)
    r = h.add_run("DANH MỤC HÌNH VẼ")
    set_run_font(r, size=16, bold=True, color=NAVY)

    for _, caption in figures:
        p = doc.add_paragraph()
        p.paragraph_format.first_line_indent = Cm(0)
        p.paragraph_format.left_indent = Cm(0.6)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.25
        r = p.add_run(caption)
        set_run_font(r, size=11.5)

    doc.add_page_break()

    h = doc.add_paragraph()
    h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    h.paragraph_format.first_line_indent = Cm(0)
    h.paragraph_format.space_after = Pt(8)
    r = h.add_run("DANH MỤC BẢNG BIỂU")
    set_run_font(r, size=16, bold=True, color=NAVY)

    for _, caption in tables:
        p = doc.add_paragraph()
        p.paragraph_format.first_line_indent = Cm(0)
        p.paragraph_format.left_indent = Cm(0.6)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.25
        r = p.add_run(caption)
        set_run_font(r, size=11.5)


def add_heading(doc, text, level, page_break=False):
    p = doc.add_heading(text, level=level)
    if page_break:
        p.paragraph_format.page_break_before = True
    return p


def add_body(doc, text):
    p = doc.add_paragraph(text)
    return p


def add_lead(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.first_line_indent = Cm(0)
    p.paragraph_format.left_indent = Cm(0.4)
    p.paragraph_format.space_after = Pt(10)
    p.paragraph_format.line_spacing = 1.4
    paragraph_border(p, color="2E5E8C", size=18, side="left", space=10)
    r = p.add_run(text)
    set_run_font(r, size=12.5, italic=True, color=RGBColor(0x2E, 0x3E, 0x52))
    return p


def add_note(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.first_line_indent = Cm(0)
    p.paragraph_format.left_indent = Cm(0.5)
    p.paragraph_format.right_indent = Cm(0.3)
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(10)
    p.paragraph_format.line_spacing = 1.3
    shade(p, "F7F3E8")
    paragraph_border(p, color="B06C30", size=12, side="left", space=8)
    r = p.add_run(text)
    set_run_font(r, size=11.5, italic=True, color=RGBColor(0x4A, 0x3B, 0x28))
    return p


def add_summary(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.first_line_indent = Cm(0)
    p.paragraph_format.left_indent = Cm(0.3)
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.line_spacing = 1.4
    shade(p, "EEF3F8")
    r = p.add_run(text)
    set_run_font(r, size=12, italic=True, color=NAVY)
    return p


def add_bullets(doc, items, numbered=False):
    style = "List Number" if numbered else "List Bullet"
    for item in items:
        p = doc.add_paragraph(item, style=style)
        p.paragraph_format.first_line_indent = Cm(0)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.4
        for r in p.runs:
            set_run_font(r, size=13)


def add_code(doc, text, caption=None):
    if caption:
        cap = doc.add_paragraph()
        cap.paragraph_format.first_line_indent = Cm(0)
        cap.paragraph_format.space_before = Pt(6)
        cap.paragraph_format.space_after = Pt(2)
        keep_with_next(cap)
        r = cap.add_run(caption)
        set_run_font(r, size=10.5, italic=True, color=GREY)

    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_fixed_layout(table)
    cell = table.rows[0].cells[0]
    cell.width = Cm(CONTENT_W)
    shade(cell, "F5F6F8")
    para = cell.paragraphs[0]
    para.paragraph_format.first_line_indent = Cm(0)
    para.paragraph_format.line_spacing = 1.0
    para.paragraph_format.space_after = Pt(0)
    para.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = para.add_run(text)
    set_run_font(run, name=CODE_FONT, size=9, color=RGBColor(0x22, 0x28, 0x33))
    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(2)
    spacer.paragraph_format.line_spacing = 0.6


def add_placeholder(doc, caption, height_cm, hint):
    table = doc.add_table(rows=1, cols=1)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_fixed_layout(table)
    set_cell_margins(table, left=0.2, right=0.2, top=0.1, bottom=0.1)
    row = table.rows[0]
    row.height = Cm(height_cm)
    row.height_rule = WD_ROW_HEIGHT_RULE.EXACTLY
    cell = row.cells[0]
    cell.width = Cm(CONTENT_W)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    shade(cell, "F8FAFC")

    p1 = cell.paragraphs[0]
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p1.paragraph_format.first_line_indent = Cm(0)
    p1.paragraph_format.space_after = Pt(4)
    r = p1.add_run("[KHU VỰC DÀNH CHO ẢNH CHỤP MÀN HÌNH]")
    set_run_font(r, size=11.5, bold=True, color=GREY)

    p2 = cell.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p2.paragraph_format.first_line_indent = Cm(0)
    p2.paragraph_format.space_after = Pt(0)
    r = p2.add_run(hint)
    set_run_font(r, size=10, italic=True, color=GREY)

    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.first_line_indent = Cm(0)
    cap.paragraph_format.space_before = Pt(3)
    cap.paragraph_format.space_after = Pt(10)
    cap.paragraph_format.line_spacing = 1.15
    r = cap.add_run(caption)
    set_run_font(r, size=11, italic=True, color=GREY)

    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(2)
    spacer.paragraph_format.line_spacing = 0.8


def add_user_stories(doc, code, stories):
    head = doc.add_paragraph()
    head.paragraph_format.first_line_indent = Cm(0)
    head.paragraph_format.space_before = Pt(10)
    head.paragraph_format.space_after = Pt(3)
    keep_with_next(head)
    r = head.add_run(f"User story của {code}")
    set_run_font(r, size=11.5, bold=True, color=NAVY)

    for us_code, text, acs in stories:
        p = doc.add_paragraph()
        p.paragraph_format.first_line_indent = Cm(0)
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.3
        r = p.add_run(f"{us_code}  ")
        set_run_font(r, size=11, bold=True, color=DARK)
        r = p.add_run(text)
        set_run_font(r, size=11, color=DARK)
        for ac in acs:
            q = doc.add_paragraph(ac, style="List Bullet")
            q.paragraph_format.first_line_indent = Cm(0)
            q.paragraph_format.space_after = Pt(1)
            q.paragraph_format.line_spacing = 1.25
            for run in q.runs:
                set_run_font(run, size=10.5, italic=True, color=RGBColor(0x35, 0x3C, 0x45))


def add_figure(doc, filename, caption, width_cm, max_width):
    path = os.path.join(FIG, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    width = min(width_cm, max_width)
    # Landscape text height is 17 cm; leave ~1.5 cm for the caption so it
    # cannot be pushed alone onto the next page.
    with Image.open(path) as im:
        px_w, px_h = im.size
    height = width * px_h / px_w
    if height > 15.3:
        width = width * 15.3 / height
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.first_line_indent = Cm(0)
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(2)
    keep_with_next(p)
    p.add_run().add_picture(path, width=Cm(width))

    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.first_line_indent = Cm(0)
    cap.paragraph_format.space_before = Pt(2)
    cap.paragraph_format.space_after = Pt(6)
    cap.paragraph_format.line_spacing = 1.15
    r = cap.add_run(caption)
    set_run_font(r, size=11, italic=True, color=GREY)


def add_table(doc, spec, max_width):
    cols = spec["cols"]
    rows = spec["rows"]
    widths = spec.get("widths") or [max_width / len(cols)] * len(cols)
    total = sum(widths)
    if total > max_width:
        widths = [w * max_width / total for w in widths]
    font_size = spec.get("font", 10.5)

    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.first_line_indent = Cm(0)
    cap.paragraph_format.space_before = Pt(10)
    cap.paragraph_format.space_after = Pt(3)
    cap.paragraph_format.line_spacing = 1.15
    keep_with_next(cap)
    r = cap.add_run(spec["caption"])
    set_run_font(r, size=11, italic=True, color=NAVY)

    table = doc.add_table(rows=1, cols=len(cols))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_fixed_layout(table)
    set_cell_margins(table)

    header = table.rows[0]
    repeat_header(header)
    no_split(header)
    for cell, text, width in zip(header.cells, cols, widths):
        cell.width = Cm(width)
        shade(cell, "1F3A5F")
        para = cell.paragraphs[0]
        para.paragraph_format.first_line_indent = Cm(0)
        para.paragraph_format.line_spacing = 1.05
        para.paragraph_format.space_after = Pt(2)
        para.alignment = WD_ALIGN_PARAGRAPH.LEFT
        run = para.add_run(text)
        set_run_font(run, size=font_size, bold=True, color=RGBColor(0xFF, 0xFF, 0xFF))

    for ri, row in enumerate(rows):
        tr = table.add_row()
        no_split(tr)
        for ci, (cell, text) in enumerate(zip(tr.cells, row)):
            cell.width = Cm(widths[ci])
            para = cell.paragraphs[0]
            para.paragraph_format.first_line_indent = Cm(0)
            para.paragraph_format.line_spacing = 1.1
            para.paragraph_format.space_after = Pt(2)
            para.alignment = WD_ALIGN_PARAGRAPH.LEFT
            run = para.add_run(str(text))
            set_run_font(run, size=font_size,
                         bold=(ci == 0 and len(cols) <= 2),
                         color=DARK)
            if ri % 2 == 1:
                shade(cell, "F4F7FA")

    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(4)
    spacer.paragraph_format.line_spacing = 0.8


def add_reference(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.first_line_indent = Cm(0)
    p.paragraph_format.left_indent = Cm(0.8)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.25
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r = p.add_run(text)
    set_run_font(r, size=12)


# ----------------------------------------------------------------- main
def collect_captions():
    figs, tbls = [], []
    for b in BODY_BLOCKS:
        if b[0] == "fig":
            figs.append((b[1][0], b[1][1]))
        elif b[0] == "ph":
            figs.append((b[1][0], b[1][0]))
        elif b[0] == "tbl":
            tbls.append((b[1]["caption"], b[1]["caption"]))
    return figs, tbls


def build():
    figs, tbls = collect_captions()
    doc = setup_document()

    add_cover(doc)
    clear_footer(doc.sections[0])

    # ---- front matter
    front_sec = doc.add_section(WD_SECTION.NEW_PAGE)
    compact_section_break(doc)
    set_page_numbering(front_sec, "lowerRoman", 1)
    add_page_footer(front_sec)

    for b in F.FRONT:
        kind = b[0]
        if kind == "h1c":
            # Real Heading 1 so the section shows up in the TOC, but centred
            # and without the page break the body headings carry.
            h = doc.add_heading(b[1], level=1)
            h.alignment = WD_ALIGN_PARAGRAPH.CENTER
        elif kind == "p":
            add_body(doc, b[1])
        elif kind == "pb":
            doc.add_page_break()
        elif kind == "tbl":
            add_table(doc, b[1], CONTENT_W)

    doc.add_page_break()
    add_front_matter(doc, figs, tbls)

    # ---- body
    body_sec = doc.add_section(WD_SECTION.NEW_PAGE)
    compact_section_break(doc)
    set_page_numbering(body_sec, "decimal", 1)
    add_page_footer(body_sec)

    current_orientation = "portrait"
    skip_break = True

    def back_to_portrait():
        nonlocal current_orientation
        sec = doc.add_section(WD_SECTION.NEW_PAGE)
        compact_section_break(doc)
        sec.orientation = WD_ORIENT.PORTRAIT
        sec.page_width = Cm(21)
        sec.page_height = Cm(29.7)
        sec.left_margin = Cm(3)
        sec.right_margin = Cm(2)
        sec.top_margin = Cm(2)
        sec.bottom_margin = Cm(2)
        clear_page_numbering(sec)
        add_page_footer(sec)
        set_vertical_alignment(sec, "top")
        current_orientation = "portrait"

    def to_landscape():
        nonlocal current_orientation
        sec = doc.add_section(WD_SECTION.NEW_PAGE)
        compact_section_break(doc)
        sec.orientation = WD_ORIENT.LANDSCAPE
        sec.page_width = Cm(29.7)
        sec.page_height = Cm(21)
        sec.left_margin = Cm(2)
        sec.right_margin = Cm(2)
        sec.top_margin = Cm(2)
        sec.bottom_margin = Cm(2)
        clear_page_numbering(sec)
        add_page_footer(sec)
        set_vertical_alignment(sec, "center")
        current_orientation = "landscape"

    def is_wide(block):
        if block[0] == "fig":
            return len(block[1]) > 3 and bool(block[1][3])
        if block[0] == "tbl":
            return bool(block[1].get("landscape"))
        return False

    for idx, b in enumerate(BODY_BLOCKS):
        kind = b[0]
        wide = is_wide(b)
        next_wide = idx + 1 < len(BODY_BLOCKS) and is_wide(BODY_BLOCKS[idx + 1])
        if wide and current_orientation == "portrait":
            to_landscape()
        elif not wide and current_orientation == "landscape":
            back_to_portrait()
            if kind in ("h1", "h1c"):
                skip_break = True

        if kind == "h1":
            add_heading(doc, b[1], 1, page_break=not skip_break)
            skip_break = False
        elif kind == "h1c":
            h = add_heading(doc, b[1], 1, page_break=not skip_break)
            h.alignment = WD_ALIGN_PARAGRAPH.CENTER
            skip_break = False
        elif kind == "h2":
            add_heading(doc, b[1], 2)
        elif kind == "h3":
            add_heading(doc, b[1], 3)
        elif kind == "lead":
            add_lead(doc, b[1])
        elif kind == "p":
            add_body(doc, b[1])
        elif kind == "b" or kind == "bullets":
            add_bullets(doc, b[1], numbered=False)
        elif kind == "num":
            add_bullets(doc, b[1], numbered=True)
        elif kind == "note":
            add_note(doc, b[1])
        elif kind == "sum":
            add_summary(doc, b[1])
        elif kind == "code":
            add_code(doc, b[1][0], b[1][1])
        elif kind == "ref":
            add_reference(doc, b[1])
        elif kind == "pb":
            doc.add_page_break()
        elif kind == "fig":
            add_figure(doc, b[1][0], b[1][1], b[1][2],
                       CONTENT_W_LAND if current_orientation == "landscape" else CONTENT_W)
        elif kind == "ph":
            add_placeholder(doc, b[1][0], b[1][1], b[1][2])
        elif kind == "us":
            add_user_stories(doc, b[1][0], b[1][1])
        elif kind == "tbl":
            add_table(doc, b[1], CONTENT_W_LAND if current_orientation == "landscape" else CONTENT_W)
        else:
            raise ValueError(f"unknown block: {kind}")

        if wide and not next_wide and current_orientation == "landscape":
            back_to_portrait()

    if current_orientation == "landscape":
        back_to_portrait()

    # Ask Word to refresh the TOC and page fields when the file is opened, so the
    # reader is not left with the placeholder in the TOC field.
    # w:updateFields sits before w:compat in the CT_Settings sequence; appending it
    # at the end would break that order and can make Word reject the file.
    normalize_xml_order(doc.element)
    normalize_xml_order(doc.styles.element)
    # Touch only header/footer parts that already exist: reading section.header
    # would create an empty header and add a headerReference to every section.
    for rel in doc.part.rels.values():
        if rel.reltype.endswith(("/header", "/footer")):
            normalize_xml_order(rel.target_part.element)

    settings = doc.settings.element
    update = OxmlElement("w:updateFields")
    update.set(qn("w:val"), "true")
    compat = settings.find(qn("w:compat"))
    if compat is not None:
        compat.addprevious(update)
    else:
        settings.append(update)

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    doc.save(OUT_PATH)
    print(f"saved: {os.path.abspath(OUT_PATH)}")
    print(f"figures listed: {len(figs)}, tables listed: {len(tbls)}")


if __name__ == "__main__":
    build()
