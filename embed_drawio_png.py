import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import os, zipfile, xml.etree.ElementTree as ET, base64, re, io
from PIL import Image
import warnings

SRC = 'Bao-cao-du-an-Quan4-Culinary-Guide.docx'
doc = Document(SRC)

DRAW_FILES = [
  ('Bao-cao-du-an-Quan4-Culinary-Guide_ERD.drawio', 'B.1 — ERD toàn hệ thống (Cơ sở dữ liệu)'),
  ('Bao-cao-du-an-Quan4-Culinary-Guide_Deployment.drawio', 'B.2 — Deployment diagram (Triển khai hệ thống)'),
  ('Bao-cao-du-an-Quan4-Culinary-Guide_Component.drawio', 'B.3 — Component diagram (Lớp chức năng)'),
]

def has_drawio_with_png(drawio_path):
    """Check xem file drawio có chứa pngData hay svgData trong mxfile không."""
    try:
        with open(drawio_path, 'rb') as f:
            raw = f.read().decode('utf-8', errors='ignore')
        if 'pngData' in raw or 'data:image/png' in raw or 'data:image/svg' in raw:
            return True, raw
        if '<diagram name="page1"' in raw:
            # Có thể chứa base64 trong mxGraphModel -> child element 'mxfile'
            return True, raw
        return False, raw
    except Exception as e:
        print('Khong doc duoc drawio:', drawio_path, e)
        return False, None

def extract_image_from_drawio(drawio_path, fmt='png'):
    """Từ draw.io file, lấy ảnh PNG/SVG đã nhúng (nếu có)."""
    ok, raw = has_drawio_with_png(drawio_path)
    if not ok:
        return None, 'Không tìm thấy ảnh nhúng trong drawio (chưa xuất PNG/SVG).'
    # Tìm data URI png hoặc svg
    # draw.io thường lưu ảnh trong element <mxCell ...> với thuộc tính image như data URI
    # Tuy nhiên file drawio thuần (XML) thường không tự chứa png đó trừ khi người dùng export
    # Và chúng ta tạo file từ XML donc chưa nhúng ảnh.
    # -> fallback: mình sẽ tự tạo PNG bằng cách mở drawio (không thể tự động), hoặc tạo hình đơn giản.
    return None, 'File draw.io thuần chỉ chứa XML, chưa có PNG/SVG nhúng. Cần xuất ảnh thủ công hoặc tự tạo.'

def add_image_to_doc(doc, path_png, width_inches=6.0):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run()
    run.add_picture(path_png, width=Inches(width_inches))
    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p2.add_run(os.path.basename(path_png))
    r.italic = True
    r.font.size = Pt(9)
    return p

def create_simple_diagram_png(drawio_path, title, output_png):
    """Tự tạo một PNG minh họa đơn giản (placeholder) vì draw.io thuần không chứa ảnh."""
    # Dùng matplotlib vẽ sơ đồ block đơn giản mô tả các thành phần chính của sơ đồ,
    # dựa trên tên các bảng/thành phần đã biết từ trước.
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
        import textwrap
    except Exception as e:
        print('Matplotlib không có:', e)
        return None, f'Không thể sinh PNG tự động (thiếu matplotlib): {e}'

    # Tạo sketch sơ đồ theo từng loại
    if 'ERD' in title:
        fig, ax = plt.subplots(figsize=(11, 7.5))
        ax.set_xlim(0, 100); ax.set_ylim(0, 100); ax.axis('off')
        ax.text(50, 97, 'ERD — District4 Culinary Guide', ha='center', fontsize=16, weight='bold')
        entities = [
            'languages', 'roles', 'permissions', 'role_permissions',
            'users', 'categories', 'culinary_places', 'culinary_place_translations',
            'culinary_place_images', 'dishes', 'dish_translations',
            'audio_guides', 'dish_audio_guides', 'culinary_routes', 'route_stops',
            'route_translations', 'visitor_favorites', 'visitor_history',
            'scan_logs', 'audio_play_logs',
        ]
        ax.text(3, 92, 'Entity tables (PK/FK):', fontsize=11, weight='bold')
        x0, y0 = 3, 85
        for i, e in enumerate(entities):
            col = i % 5
            row = i // 5
            x = x0 + col*18.5
            y = y0 - row*6
            ax.add_patch(FancyBboxPatch((x, y-3.5), 16.5, 5.5, boxstyle='round,pad=0.2', fc='#e3f2fd', ec='#1565c0', lw=1.2))
            ax.text(x+8.25, y-0.75, e, ha='center', va='center', fontsize=8.5)
        ax.text(3, 50, 'Mối quan hệ (1-n) & khóa ngoại:', fontsize=11, weight='bold')
        rels = [
            ('categories -> culinary_places', 0),
            ('categories -> dishes', 1),
            ('languages -> culinary_place_translations', 2),
            ('languages -> dish_translations', 3),
            ('languages -> route_translations', 4),
            ('culinary_places -> culinary_place_translations', 5),
            ('culinary_places -> dishes (FK)', 6),
            ('culinary_places -> culinary_place_images', 7),
            ('culinary_places -> route_stops', 8),
            ('dishes -> dish_translations', 9),
            ('dish_translations -> dish_audio_guides', 10),
            ('culinary_place_translations -> audio_guides', 11),
        ]
        for i,(r,_) in enumerate(rels):
            y = 48 - i*3.2
            ax.text(3, y, r, fontsize=8.5)
        ax.text(3, 5, 'Lưu ý: ON CONFLICT DO NOTHING / DO UPDATE tùy file seed.', fontsize=9, style='italic', color='#c62828')
        plt.savefig(output_png, dpi=150, bbox_inches='tight')
        plt.close()
        return output_png, 'PNG sketch ERD tạo tự động (placeholder).'

    elif 'Deployment' in title:
        fig, ax = plt.subplots(figsize=(11, 7.5))
        ax.set_xlim(0,100); ax.set_ylim(0,100); ax.axis('off')
        ax.text(50,97,'Deployment — District4 Culinary Guide', ha='center', fontsize=16, weight='bold')
        # Network cloud
        ax.add_patch(plt.Circle((50,88), 22, fill=False, ec='#9e9e9e', lw=1.5))
        ax.text(50,88,'Internet / Client', ha='center', va='center', fontsize=10, style='italic')
        clients = [
            ('Mobile (Expo)', 15, 70, '#e8f5e9'),
            ('Web Client (React+Vite)', 50, 72, '#e3f2fd'),
            ('Admin Web (static, :8080)', 85, 70, '#f1f8e9'),
        ]
        for label,x,y,color in clients:
            ax.add_patch(FancyBboxPatch((x-15,y-9),30,18,boxstyle='round,pad=0.3',fc=color,ec='#388e3c',lw=1.2))
            ax.text(x, y, label, ha='center', va='center', fontsize=9)
        # arrows to server
        for x in (15,50,85):
            ax.add_patch(FancyArrowPatch((x,60),(50,50),arrowstyle='->',mutation_scale=12,color='#555',lw=1))
        # server box
        ax.add_patch(FancyBboxPatch((25,35),50,22,boxstyle='round,pad=0.3',fc='#fff3e0',ec='#ef6c00',lw=1.5))
        ax.text(50,46,'Backend — Node.js + Express (:5001)',ha='center',fontsize=10,weight='bold')
        ax.text(50,40,'68 route /api · TTS · Multer · QR · JWT',ha='center',fontsize=8.5)
        # postgres
        ax.add_patch(FancyBboxPatch((10,12),35,16,boxstyle='round,pad=0.3',fc='#e3f2fd',ec='#1565c0',lw=1.5))
        ax.text(27.5,20,'PostgreSQL 16\n(container d4-postgres)',ha='center',va='center',fontsize=9)
        ax.add_patch(FancyArrowPatch((35,28),(65,30),arrowstyle='->',mutation_scale=12,color='#555',lw=1))
        # admin-web static
        ax.add_patch(FancyBboxPatch((55,12),35,16,boxstyle='round,pad=0.3',fc='#f1f8e9',ec='#7cb342',lw=1.5))
        ax.text(72.5,20,'admin-web (container d4-web)\nbuild tĩnh, Nginx',ha='center',va='center',fontsize=9)
        # externals
        ax.add_patch(FancyBboxPatch((25,0),50,8,boxstyle='round,pad=0.2',fc='#f1f8e9',ec='#7cb342',lw=1.2))
        ax.text(50,4,'External: Google Translate TTS (keyless) / Google Cloud / ElevenLabs / Edge · OpenStreetMap · QR client-side',ha='center',va='center',fontsize=7.5)
        plt.savefig(output_png, dpi=150, bbox_inches='tight')
        plt.close()
        return output_png, 'PNG sketch deployment tạo tự động (placeholder).'

    elif 'Component' in title:
        fig, ax = plt.subplots(figsize=(11, 7.5))
        ax.set_xlim(0,100); ax.set_ylim(0,100); ax.axis('off')
        ax.text(50,97,'Component — District4 Culinary Guide', ha='center', fontsize=16, weight='bold')
        ax.text(10,90,'Client Layer', fontsize=11, weight='bold')
        for i,(label,x,color) in enumerate([
            ('Web Client (React+Vite)', 5, '#e3f2fd'),
            ('Mobile Client (Expo SDK51)', 40, '#e8f5e9'),
            ('iOS web export (dev)', 75, '#f3e5f5'),
        ]):
            ax.add_patch(FancyBboxPatch((x,81),30,13,boxstyle='round,pad=0.3',fc=color,ec='#1565c0',lw=1.2))
            ax.text(x+15,87.5,label,ha='center',va='center',fontsize=8.5)
        ax.text(10,73,'REST API Boundary (/api)', fontsize=11, weight='bold')
        ax.add_patch(FancyBboxPatch((5,64),90,13,boxstyle='round,pad=0.3',fc='#fff8e1',ec='#f57f17',lw=1.5))
        ax.text(50,70.5,'Express server — 68 route · middleware (helmet/cors/rate-limit/JWT) · chuẩn lỗi · validators',ha='center',va='center',fontsize=8.5)
        ax.text(10,55,'Service Layer', fontsize=11, weight='bold')
        svcs = [
            'authService','placeService','catalogService','mediaService (TTS/upload/audioDuration parse MPEG)',
            'dishAudioService','geoAudioService','audioWarmupService (boot)','statsService (dashboard)',
        ]
        for i,s in enumerate(svcs):
            x = 5 + (i%2)*48
            y = 50 - (i//2)*3.2
            ax.add_patch(FancyBboxPatch((x,y-2.2),45,4.5,boxstyle='round,pad=0.2',fc='#fff3e0',ec='#ef6c00',lw=1))
            ax.text(x+22.5,y+0.05,s,ha='center',va='center',fontsize=7.5)
        ax.text(10,32,'Composer narration (~30s) — MỚI (đường loang = dependency)',fontsize=10,weight='bold',color='#c2185b')
        ax.add_patch(FancyBboxPatch((5,18),90,13,boxstyle='round,pad=0.3',fc='#fce4ec',ec='#c2185b',lw=1.5))
        ax.text(50,24.5,'server/src/utils/narration.js + mirror web\nLuôn name+short_desc+desc; bổ history→cultural→tips theo câu\nBảng chars/s: vi 12.64 · en 14.85 · zh 3.37 · ko 6.20 · ja 4.46',ha='center',va='center',fontsize=7.5)
        ax.text(10,8,'Persistence: PostgreSQL 16 (xem ERD)',fontsize=10,color='#00838f')
        plt.savefig(output_png, dpi=150, bbox_inches='tight')
        plt.close()
        return output_png, 'PNG sketch component tạo tự động (placeholder).'
    else:
        return None, 'Không nhận diện loại sơ đồ để vẽ placeholder.'

# Thực hiện chèn ảnh
for drawio_path, title in DRAW_FILES:
    print('Đang xử lý:', drawio_path)
    # 1) Thử lấy ảnh từ drawio (thường không có vì ta tạo từ XML thuần)
    img_bytes, reason = extract_image_from_drawio(drawio_path)
    if img_bytes is None:
        # 2) Tự tạo PNG sketch placeholder
        out_png = drawio_path.replace('.drawio', '_placeholder.png')
        ok, msg = create_simple_diagram_png(drawio_path, title, out_png)
        if ok:
            print('Tạo PNG placeholder:', out_png, '->', msg)
            # Xóa đoạn "Tệp sơ đồ: ... " cũ trong docx và chèn ảnh
            # Tìm đoạn chứa tên file trong doc và xóa nó
            for para in doc.paragraphs:
                if drawio_path in para.text:
                    # xóa paragraph đó
                    p_element = para._p
                    p_element.getparent().remove(p_element)
                    break
            # Thêm ảnh ngay trước heading B.x tương ứng
            # Tìm heading B.x trong doc (đoạn heading có title)
            insert_before = None
            for para in doc.paragraphs:
                if title in para.text and para.style.name.startswith('Heading'):
                    insert_before = para
                    break
            if insert_before is None:
                # fallback: thêm ở cuối trước khi thêm phụ lục C
                # Dễ nhất: chèn ảnh vào sau khi thêm tiêu đề B.x - nhưng B.x đã có sẵn
                pass
            # Thực tế insert ảnh ngay sau heading B.x
            if insert_before is not None:
                # thêm ảnh vào trước heading đó
                new_p = doc.add_paragraph()
                new_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = new_p.add_run()
                run.add_picture(out_png, width=Inches(6.2))
                new_p2 = doc.add_paragraph()
                new_p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r2 = new_p2.add_run(os.path.basename(out_png))
                r2.italic = True; r2.font.size = Pt(9)
                # Xóa đoạn "Tệp sơ đồ: ..." cũ đã làm ở trên; thêm ảnh vào trước heading => văn bản bắt đầu từ dưới heading
                # Thay vì phức tạp, mình thêm ảnh ngay sau heading (sau đoạn desc) bằng cách chèn vào 요소 sau heading
                # Cách đơn giản: di chuyển ảnh xuống sau heading B.x
                # Ta xác định heading, chuyển ảnh vào sau heading bằng cách thêm vào trước heading rồi reorder? Không ổn.
                # -> Cách thay thế: thêm ảnh vào một dòng mới sau heading B.x bằng cách tìm heading rồi insert vào poosition sau nó.
                # Document insert: dùng method insert_paragraph_before của heading? Không có. Dùng cách thủ công qua XML.
                # Cách dễ:
                heading_element = insert_before._p
                parent = heading_element.getparent()
                idx = list(parent).index(heading_element)
                # Tạo paragraph mới chứa ảnh
                new_para = doc.add_paragraph()
                new_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = new_para.add_run()
                run.add_picture(out_png, width=Inches(6.2))
                new_p2 = doc.add_paragraph()
                new_p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r2 = new_p2.add_run(os.path.basename(out_png))
                r2.italic = True; r2.font.size = Pt(9)
                # Chuyển 2 paragraph mới vào trước heading
                new_p_elem = new_para._p
                new_p2_elem = new_p2._p
                parent.insert(idx, new_p2_elem)
                parent.insert(idx, new_p_elem)
            print('Đã thêm ảnh trước heading:', title)
        else:
            print('Không tạo được PNG cho', drawio_path, msg)

doc.save(SRC)
print('Saved:', SRC, 'size:', os.path.getsize(SRC))
