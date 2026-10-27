# -*- coding: utf-8 -*-
"""Sinh CNPM_ERD.drawio - ERD 15 bang nghiep vu cua du an (16 bang cua DB tru schema_migrations)."""
import xml.sax.saxutils as sx

ROW_H = 24
HEAD_H = 28
W = 300

def entity(eid, title, x, y, rows, fill, stroke):
    h = HEAD_H + ROW_H * len(rows)
    out = []
    base = ("swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=stackLayout;"
            "horizontal=1;startSize=%d;horizontalStack=0;resizeParent=1;resizeParentMax=0;"
            "resizeLast=0;collapsible=0;marginBottom=0;html=1;whiteSpace=wrap;"
            "fillColor=%s;strokeColor=%s;fontSize=12;") % (HEAD_H, fill, stroke)
    out.append('<mxCell id="%s" value="%s" style="%s" vertex="1" parent="1">'
               '<mxGeometry x="%d" y="%d" width="%d" height="%d" as="geometry"/></mxCell>'
               % (eid, sx.escape(title), base, x, y, W, h))
    for i, (txt, bold) in enumerate(rows):
        st = ("text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=6;"
              "overflow=hidden;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;rotatable=0;"
              "whiteSpace=wrap;html=1;fontSize=10;")
        if bold:
            st += "fontStyle=1;"
        out.append('<mxCell id="%s_r%d" value="%s" style="%s" vertex="1" parent="%s">'
                   '<mxGeometry y="%d" width="%d" height="%d" as="geometry"/></mxCell>'
                   % (eid, i, sx.escape(txt), st, eid, HEAD_H + i * ROW_H, W, ROW_H))
    return "\n".join(out)

def edge(eid, src, tgt, style, label="", points=None):
    pts = ""
    if points:
        arr = "".join('<mxPoint x="%g" y="%g"/>' % p for p in points)
        pts = '<Array as="points">%s</Array>' % arr
    return ('<mxCell id="%s" value="%s" style="%s" edge="1" parent="1" source="%s" target="%s">'
            '<mxGeometry relative="1" as="geometry">%s</mxGeometry></mxCell>'
            % (eid, sx.escape(label), style, src, tgt, pts))

SOLID = ("edgeStyle=none;html=1;startArrow=ERone;endArrow=ERmany;endFill=0;startFill=0;"
         "fontSize=10;labelBackgroundColor=#ffffff;jettySize=auto;orthogonalLoop=1;")
FLAT = "edgeStyle=none;html=1;endArrow=none;startArrow=none;"
DASH = "edgeStyle=none;html=1;endArrow=open;dashed=1;fontSize=10;strokeColor=#9673a6;labelBackgroundColor=#ffffff;"

# (id, title, x, y, rows[(text,bold)], fill, stroke)
BLUE_F, BLUE_S = "#dae8fc", "#6c8ebf"
GRN_F, GRN_S = "#d5e8d4", "#82b366"
ORG_F, ORG_S = "#ffe6cc", "#d79b00"
PUR_F, PUR_S = "#e1d5e7", "#9673a6"
YEL_F, YEL_S = "#fff2cc", "#d6b656"
RED_F, RED_S = "#f8cecc", "#b85450"
GRY_F, GRY_S = "#f5f5f5", "#666666"

ents = [
    entity("roles", "roles", 40, 60, [
        ("id : SERIAL   PK", True),
        ("code : VARCHAR   UQ", True),
        ("name : VARCHAR", False),
        ("description : TEXT", False),
    ], BLUE_F, BLUE_S),
    entity("role_permissions", "role_permissions", 40, 240, [
        ("role_id : FK den roles   (PK)", True),
        ("permission_id : FK den permissions   (PK)", True),
    ], BLUE_F, BLUE_S),
    entity("permissions", "permissions", 40, 380, [
        ("id : SERIAL   PK", True),
        ("code : VARCHAR   UQ", True),
        ("description : TEXT", False),
    ], BLUE_F, BLUE_S),
    entity("users", "users", 40, 560, [
        ("id : SERIAL   PK", True),
        ("email : VARCHAR(255)   UQ", True),
        ("password_hash : VARCHAR(255)", False),
        ("full_name : VARCHAR(255)", False),
        ("role_id : INT   FK den roles", True),
        ("is_active : BOOLEAN", False),
        ("last_login_at : TIMESTAMPTZ", False),
        ("created_at / updated_at", False),
    ], BLUE_F, BLUE_S),
    entity("categories", "categories", 420, 60, [
        ("id : SERIAL   PK", True),
        ("code : VARCHAR(50)   UQ", True),
        ("name : VARCHAR(150)", False),
        ("applies_to : place / dish / both", False),
        ("icon : VARCHAR(20)", False),
        ("is_active : BOOLEAN", False),
        ("created_at / updated_at", False),
    ], GRN_F, GRN_S),
    entity("culinary_places", "culinary_places", 420, 340, [
        ("id : SERIAL   PK", True),
        ("code : VARCHAR(80)   UQ", True),
        ("category_id : FK den categories", True),
        ("address : VARCHAR(300)", False),
        ("latitude / longitude : DOUBLE", False),
        ("phone / website", False),
        ("price_range : VARCHAR(80)", False),
        ("price_min / price_max : INT", False),
        ("opening_time / closing_time", False),
        ("zone_radius / zone_exit_buffer", False),
        ("is_recommended : BOOLEAN", False),
        ("status : DRAFT/PUBLISHED/ARCHIVED", False),
        ("created_at / updated_at", False),
    ], GRN_F, GRN_S),
    entity("dishes", "dishes", 420, 760, [
        ("id : SERIAL   PK", True),
        ("code : VARCHAR(80)   UQ", True),
        ("culinary_place_id : FK den places", True),
        ("category_id : FK den categories", True),
        ("price : VARCHAR(80)", False),
        ("image_url : VARCHAR(500)", False),
        ("is_signature : BOOLEAN", False),
        ("status : DRAFT/PUBLISHED/ARCHIVED", False),
        ("created_at / updated_at", False),
    ], GRN_F, GRN_S),
    entity("culinary_routes", "culinary_routes", 800, 60, [
        ("id : SERIAL   PK", True),
        ("code : VARCHAR(80)   UQ", True),
        ("estimated_duration / distance", False),
        ("difficulty : EASY/MODERATE/HARD", False),
        ("cover_image_url : VARCHAR(500)", False),
        ("status : DRAFT/PUBLISHED/ARCHIVED", False),
        ("created_at / updated_at", False),
    ], ORG_F, ORG_S),
    entity("route_stops", "route_stops", 800, 340, [
        ("id : SERIAL   PK", True),
        ("route_id : FK den culinary_routes", True),
        ("culinary_place_id : FK den places", True),
        ("position : INT", False),
        ("note : TEXT", False),
        ("UQ (route_id, position)", True),
        ("created_at", False),
    ], ORG_F, ORG_S),
    entity("media_files", "media_files", 800, 620, [
        ("id : SERIAL   PK", True),
        ("entity_type : place / dish / translation", True),
        ("entity_id : INT (khong co FK vat ly)", True),
        ("kind : image / audio / qr", True),
        ("url : VARCHAR(500)", False),
        ("alt_text : VARCHAR(300)", False),
        ("duration / file_size : INT", False),
        ("mime_type : VARCHAR(100)", False),
        ("source : UPLOAD / TTS", False),
        ("sort_order / is_primary", False),
        ("metadata : JSONB", False),
        ("created_at / updated_at", False),
    ], YEL_F, YEL_S),
    entity("languages", "languages", 1180, 60, [
        ("id : SERIAL   PK", True),
        ("code : VARCHAR(10)   UQ", True),
        ("name : VARCHAR(100)", False),
        ("native_name : VARCHAR(100)", False),
        ("is_active : BOOLEAN", False),
        ("bcl : VARCHAR(20)", False),
        ("voice_note : VARCHAR(200)", False),
        ("created_at / updated_at", False),
    ], PUR_F, PUR_S),
    entity("translations", "translations", 1180, 380, [
        ("id : SERIAL   PK", True),
        ("entity_type : place / dish / route", True),
        ("entity_id : INT (khong co FK vat ly)", True),
        ("language_id : FK den languages", True),
        ("name : VARCHAR(255)", False),
        ("short_description : TEXT", False),
        ("description : TEXT", False),
        ("history : TEXT", False),
        ("cultural_significance : TEXT", False),
        ("tourist_tips : TEXT", False),
        ("ingredients : TEXT", False),
        ("cultural_information : TEXT", False),
        ("created_at / updated_at", False),
        ("UQ (type, id, language_id)", True),
    ], PUR_F, PUR_S),
    entity("guest_sessions", "guest_sessions", 1560, 60, [
        ("id : VARCHAR(64)   PK", True),
        ("token_hash : SHA-256", False),
        ("display_id : VARCHAR(64)   UQ", True),
        ("free_language_id : FK den languages", True),
        ("free_language_id_2 : FK den languages", True),
        ("purchased_languages : INT[]", False),
        ("expires_at : TTL 90 ngay", False),
        ("created_at / updated_at", False),
    ], RED_F, RED_S),
    entity("checkouts", "checkouts", 1560, 380, [
        ("id : SERIAL   PK", True),
        ("guest_session_id : FK den guest_sessions", True),
        ("language_id : FK den languages", True),
        ("amount / currency : VND", False),
        ("provider : SANDBOX", False),
        ("provider_transaction_id : UQ", True),
        ("status : pending/success/failed", False),
        ("paid_at : TIMESTAMPTZ", False),
        ("idempotency_key : UQ", True),
        ("created_at / updated_at", False),
    ], RED_F, RED_S),
    entity("activity_logs", "activity_logs", 1560, 780, [
        ("id : SERIAL   PK", True),
        ("event_type : fav / view / scan / play", True),
        ("session_id : VARCHAR(64)", False),
        ("user_id : FK den users", True),
        ("guest_session_id : FK den guest_sessions", True),
        ("culinary_place_id : FK den places", True),
        ("translation_id : FK den translations", True),
        ("language_id : FK den languages", True),
        ("device_type / platform", False),
        ("metadata : JSONB", False),
        ("created_at", False),
    ], GRY_F, GRY_S),
]

edges = [
    edge("r1", "roles", "users",
         SOLID + "exitX=0;exitY=0.5;entryX=0;entryY=0.5;",
         points=[(15, 122), (15, 682)]),
    edge("r2", "role_permissions", "roles",
         SOLID + "exitX=0.5;exitY=0;entryX=0.5;entryY=1;"),
    edge("r3", "role_permissions", "permissions",
         SOLID + "exitX=0.167;exitY=1;entryX=0.167;entryY=0;"),
    edge("c1", "categories", "culinary_places",
         SOLID + "exitX=0.5;exitY=1;entryX=0.5;entryY=0;"),
    edge("c2", "categories", "dishes",
         SOLID + "exitX=0;exitY=0.5;entryX=0;entryY=0.5;",
         points=[(380, 158), (380, 882)]),
    edge("c3", "culinary_places", "dishes",
         SOLID + "exitX=0.5;exitY=1;entryX=0.5;entryY=0;", "thuộc địa điểm"),
    edge("t1", "culinary_routes", "route_stops",
         SOLID + "exitX=0.3;exitY=1;entryX=0.3;entryY=0;"),
    edge("t2", "culinary_places", "route_stops",
         SOLID + "exitX=1;exitY=0.288;entryX=0;entryY=0.5;", "diem dung"),
    edge("l1", "languages", "translations",
         SOLID + "exitX=0.5;exitY=1;entryX=0.5;entryY=0;"),
    edge("l2", "languages", "guest_sessions",
         SOLID + "exitX=1;exitY=0.409;entryX=0;entryY=0.409;",
         label="2 slot miễn phí", points=[(1520, 150)]),
    edge("l3", "languages", "checkouts",
         SOLID + "exitX=1;exitY=0.818;entryX=0;entryY=0.308;",
         points=[(1520, 240), (1520, 470)]),
    edge("g1", "guest_sessions", "checkouts",
         SOLID + "exitX=0.5;exitY=1;entryX=0.5;entryY=0;", "mua mở khóa"),
    edge("g2", "guest_sessions", "activity_logs",
         SOLID + "exitX=1;exitY=0.5;entryX=1;entryY=0.5;",
         points=[(1905, 170), (1905, 926)]),
    edge("g3", "languages", "activity_logs",
         SOLID + "exitX=0;exitY=0.682;entryX=0.217;entryY=1;",
         points=[(1140, 210), (1140, 1120), (1625, 1120)]),
    edge("g4", "translations", "activity_logs",
         SOLID + "exitX=0.5;exitY=1;entryX=0.433;entryY=1;",
         points=[(1330, 1100), (1690, 1100)]),
    edge("g5", "users", "activity_logs",
         SOLID + "exitX=0.5;exitY=1;entryX=0.733;entryY=1;",
         points=[(190, 1140), (1780, 1140)]),
    edge("p1", "translations", "culinary_places",
         DASH + "exitX=0;exitY=0.495;entryX=0.667;entryY=0;",
         label="đa hình (entity_type)",
         points=[(1160, 560), (1160, 320), (620, 320)]),
    edge("p2", "media_files", "dishes",
         DASH + "exitX=0;exitY=0.76;entryX=1;entryY=0.41;",
         label="đa hình"),
]

note = ('<mxCell id="note" value="%s" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f5f5f5;'
        'strokeColor=#666666;fontSize=11;align=left;verticalAlign=middle;spacingLeft=14;'
        'spacingRight=14;" vertex="1" parent="1">'
        '<mxGeometry x="40" y="1170" width="1820" height="160" as="geometry"/></mxCell>') % sx.escape(
    "Ghi chú: ERD gồm 15 bảng nghiệp vụ đúng theo schema thực tế (16 bảng trong DB trừ schema_migrations — bảng kỹ thuật của migrate.js). "
    "Ngoài các FK đã vẽ, activity_logs còn FK tới culinary_places (ON DELETE CASCADE).<br>"
    "Quan hệ đa hình (KHÔNG có FK vật lý, kiểm tra ở tầng dịch vụ): translations(entity_type, entity_id) → "
    "culinary_places / dishes / culinary_routes;  media_files(entity_type, entity_id) → culinary_places / dishes / translations (audio).<br>"
    "Ràng buộc duy nhất: translations UQ(entity_type, entity_id, language_id); 1 audio / translation (uq_media_audio_translation); "
    "1 QR / entity (uq_media_qr_entity); 1 checkout 'success' duy nhất mỗi (guest, language); UQ(session, place) cho event 'favorite'.<br>"
    "Paywall: guest_sessions có 2 slot ngôn ngữ miễn phí (free_language_id, free_language_id_2); từ ngôn ngữ thứ 3 phải mua qua checkouts (20.000 VND).")

title = ('<mxCell id="title" value="%s" style="text;html=1;fontSize=20;fontStyle=1;align=left;" vertex="1" parent="1">'
         '<mxGeometry x="40" y="10" width="1100" height="30" as="geometry"/></mxCell>') % sx.escape(
    "Sơ đồ ERD — Hệ thống ẩm thực đa ngôn ngữ Quận 4 (15 bảng)")

legend = ('<mxCell id="legend" value="%s" style="text;html=1;fontSize=12;align=right;whiteSpace=wrap;" vertex="1" parent="1">'
          '<mxGeometry x="1160" y="10" width="700" height="30" as="geometry"/></mxCell>') % sx.escape(
    "Màu = domain nghiệp vụ | PK/FK/UQ ghi trong tên trường | nét đứt = quan hệ đa hình (không FK vật lý)")

cells = "\n".join(ents) + "\n" + "\n".join(edges) + "\n" + note + "\n" + title + "\n" + legend

xml = '''<mxfile host="app.diagrams.net" version="24.7.8" type="device">
  <diagram id="erd15" name="ERD 15 bang">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="2000" pageHeight="1400" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
%s
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>''' % cells

with open("CNPM_ERD.drawio", "w", encoding="utf-8") as f:
    f.write(xml)
print("written CNPM_ERD.drawio")
