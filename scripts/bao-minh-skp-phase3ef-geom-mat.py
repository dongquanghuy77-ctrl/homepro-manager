# -*- coding: utf-8 -*-
"""
BAO MINH CMT8 - PHASE 3E: Geometry / Dimension Extraction + Phase 3F: Material Master
Reads component-inventory.json + raw model, builds geometry and material records
"""

import sys, io, json, os, math
from collections import Counter, defaultdict
from datetime import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

RAW = "docs/projects/BAO-MINH-CMT8/sketchup/sketchup-raw-model.json"
INV = "docs/projects/BAO-MINH-CMT8/sketchup/component-inventory.json"
OUT_DIR = "docs/projects/BAO-MINH-CMT8/sketchup"
LOG = lambda msg: print(msg, flush=True)

LOG("[3E/3F] Loading data...")
with open(RAW, encoding='utf-8') as f:
    raw = json.load(f)
with open(INV, encoding='utf-8') as f:
    inv = json.load(f)

SHA256 = raw["sha256"]
MATERIALS_RAW = raw.get("materials", [])
DEFS_RAW = raw.get("component_definitions", [])
ROOT_INSTS = raw.get("root_instances", [])
INVENTORY = inv.get("component_inventory", [])
PROD_DEFS = inv.get("production_definitions", [])

LOG("[3E] defs: " + str(len(DEFS_RAW)))
LOG("[3E] inventory: " + str(len(INVENTORY)))
LOG("[3F] materials: " + str(len(MATERIALS_RAW)))

# ═══════════════════════════════════════════════════
# PHASE 3E — GEOMETRY / DIMENSION EXTRACTION
# ═══════════════════════════════════════════════════

# Build def_id -> raw_def lookup
def_lookup = {dd["definition_id"]: dd for dd in DEFS_RAW}

# Furniture part name keywords → production role
PART_ROLES = {
    "hồi": "SIDE_PANEL",
    "hậu": "BACK_PANEL",
    "nóc": "TOP_PANEL",
    "đáy": "BOTTOM_PANEL",
    "thành": "SHELF",
    "đợt": "SHELF",
    "cánh cửa": "DOOR",
    "cánh": "DOOR",
    "mnk": "DRAWER_FRONT",
    "len chân": "BASE_STRIP",
    "nẹp": "TRIM_STRIP",
    "chỉ": "TRIM_STRIP",
    "h.giữa": "MIDDLE_PARTITION",
    "hông trái": "SIDE_PANEL_LEFT",
    "hông phải": "SIDE_PANEL_RIGHT",
    "thanh móc tay": "HANDLE_RAIL",
    "difference": "CUTOUT",
    "[2]bend_panel": "EDGE_BENT",
    "đáy nk": "DRAWER_BOTTOM",
    "thành nk": "DRAWER_SIDE",
    "outershell": "OUTER_SHELL",
}

def detect_role(name_raw):
    if not name_raw:
        return "UNKNOWN"
    n = name_raw.lower().strip()
    for kw, role in PART_ROLES.items():
        if kw in n:
            return role
    return "UNKNOWN"

# Determine primary material from face_materials
def primary_material(face_mats):
    if not face_mats:
        return None, 0
    sorted_mats = sorted(face_mats.items(), key=lambda x: -x[1])
    return sorted_mats[0][0], sorted_mats[0][1]

# Build geometry records
geometry_records = []
geom_stats = {"total": 0, "with_bb": 0, "without_bb": 0, "with_role": 0, "roles": Counter()}

for comp in INVENTORY:
    def_id = comp.get("definition_id")
    dd = def_lookup.get(def_id, {})
    bb = comp.get("bounding_box") or dd.get("bounding_box")
    inst_name = comp.get("instance_name", "")
    layer = comp.get("layer", "")
    comp_type = comp.get("component_type", "UNKNOWN")
    face_mats = comp.get("face_materials") or dd.get("face_materials", {})

    role = detect_role(inst_name)
    if role == "UNKNOWN" and comp_type != "UNKNOWN":
        role = comp_type

    prim_mat, prim_mat_count = primary_material(face_mats)

    geom_stats["total"] += 1
    geom_stats["roles"][role] += 1

    rec = {
        "geom_id": "GEOM-" + str(comp["root_instance_index"]).zfill(4),
        "inventory_id": comp["inventory_id"],
        "instance_name": inst_name,
        "layer": layer,
        "component_type": comp_type,
        "production_role": role,
        "source_unit": "mm (SketchUp model unit)",
        "internal_unit": "inches (converted x25.4)",
    }

    if bb:
        geom_stats["with_bb"] += 1
        L = bb.get("length_mm", 0) or 0
        W = bb.get("width_mm", 0) or 0
        H = bb.get("height_mm", 0) or 0

        # Classify thickness: smallest non-zero dimension
        dims = sorted([d for d in [L, W, H] if d > 0.5])
        thickness = dims[0] if len(dims) >= 2 else None
        length = dims[-1] if dims else 0
        width = dims[-2] if len(dims) >= 2 else 0

        # Area (face area approximation from bounding box)
        area_mm2 = length * width if length and width else 0
        area_m2 = round(area_mm2 / 1e6, 6)

        geom_stats["with_role"] += 1 if role != "UNKNOWN" else 0

        geom_rec = {
            "source_value_length_mm": round(L, 4),
            "source_value_width_mm": round(W, 4),
            "source_value_height_mm": round(H, 4),
            "normalized_length_mm": round(length, 2),
            "normalized_width_mm": round(width, 2),
            "normalized_thickness_mm": round(thickness, 2) if thickness else None,
            "area_face_mm2": round(area_mm2, 2),
            "area_face_m2": area_m2,
            "normalized_unit": "mm",
            "vertex_count": bb.get("vertex_count", 0),
        }
        rec.update(geom_rec)
    else:
        geom_stats["without_bb"] += 1
        rec["no_geometry"] = True

    rec["primary_material"] = prim_mat
    rec["primary_material_face_count"] = prim_mat_count
    rec["face_materials"] = face_mats
    rec["face_count"] = comp.get("face_count", 0)

    geometry_records.append(rec)

LOG("[3E] Geometry records: " + str(geom_stats["total"]))
LOG("[3E] With bounding box: " + str(geom_stats["with_bb"]))
LOG("[3E] Without: " + str(geom_stats["without_bb"]))
LOG("[3E] Role distribution: " + str(dict(geom_stats["roles"].most_common(20))))

geom_output = {
    "phase": "3E",
    "generated_at": datetime.now().isoformat(),
    "source_sha256": SHA256,
    "summary": {
        "total_geometry_records": geom_stats["total"],
        "with_bounding_box": geom_stats["with_bb"],
        "without_bounding_box": geom_stats["without_bb"],
        "production_role_distribution": dict(geom_stats["roles"].most_common()),
    },
    "geometry_records": geometry_records,
}

geom_path = os.path.join(OUT_DIR, "geometry-dimensions.json")
with open(geom_path, 'w', encoding='utf-8') as f:
    json.dump(geom_output, f, indent=2, ensure_ascii=False, default=str)
LOG("[3E] Written: " + geom_path + " (" + str(os.path.getsize(geom_path)) + " bytes)")

# ═══════════════════════════════════════════════════
# PHASE 3F — MATERIAL MASTER EXTRACTION
# ═══════════════════════════════════════════════════

# Materials from directive to check
DIRECTIVE_MATERIALS = ["AC - 9205 S", "HN - 111G", "BT - 200T", "BT - SC 010 MW", "THAN TRE", "GO GHEP THANH", "MICA"]
# Layer_XXX materials are auto-generated by openskp from layer names — not real surface materials
LAYER_PREFIX = "Layer_"

# Phase 2 survey materials to cross-ref
SURVEY_CONFIRMED = [
    "iWood MA PRO-3 Marble",  # wall panel
    "An Cuong AC 4017PL",    # flooring
    "An Cuong MS 608EV",     # MDF board
    "An Cuong MS 4017T",     # edge strip
]
SURVEY_UNDER_CONSIDERATION = [
    "bronze glass",
    "CCCM 802", "CCCM 810", "CCCM 823",
]

material_master = []
for mat in MATERIALS_RAW:
    name = mat.get("name", "")
    mat_id = mat.get("id")
    color_rgba = mat.get("color_rgba")
    transparency = mat.get("transparency", 0)
    texture = mat.get("texture")

    # Is this a layer-material (not a real surface material)?
    is_layer_material = name.startswith(LAYER_PREFIX)
    real_name = name[len(LAYER_PREFIX):] if is_layer_material else name

    # Check if in directive list
    in_directive = any(d.lower() in name.lower() for d in DIRECTIVE_MATERIALS)

    # ERP candidate lookup
    erp_candidate = None
    erp_confidence = "NONE"
    verification_status = "UNMAPPED"

    if is_layer_material:
        verification_status = "LAYER_MATERIAL_NOT_SURFACE"
    elif name == "MICA":
        erp_candidate = "MICA (surface finish)"
        erp_confidence = "HIGH"
        verification_status = "CANDIDATE"
    elif name == "AC - 9205 S":
        erp_candidate = "An Cuong AC 9205S"
        erp_confidence = "HIGH"
        verification_status = "CANDIDATE"
    elif name == "HN - 111G":
        erp_candidate = "Hoa Nghiem HN-111G (edge band)"
        erp_confidence = "MEDIUM"
        verification_status = "CANDIDATE"
    elif name == "BT - 200T":
        erp_candidate = "Cai Bang BT-200T"
        erp_confidence = "MEDIUM"
        verification_status = "CANDIDATE"
    elif name == "BT - SC 010 MW":
        erp_candidate = "Cai Bang BT-SC-010 MW"
        erp_confidence = "MEDIUM"
        verification_status = "CANDIDATE"
    elif name == "THAN TRE":
        erp_candidate = "Than Tre bamboo board 1220x2440x8mm"
        erp_confidence = "HIGH"
        verification_status = "CANDIDATE"
    elif name == "GO GHEP THANH":
        erp_candidate = "Go Ghep Thanh (finger-jointed timber)"
        erp_confidence = "MEDIUM"
        verification_status = "CANDIDATE"
    elif name.startswith("#"):
        erp_candidate = None
        erp_confidence = "NONE"
        verification_status = "COLOR_ONLY_NO_MATERIAL"

    tex_info = None
    if texture:
        tex_info = {
            "filename": texture.get("filename"),
            "width_scale_mm": texture.get("width_scale_mm"),
            "height_scale_mm": texture.get("height_scale_mm"),
            "has_embedded_data": texture.get("has_data", False),
        }

    material_master.append({
        "sketchup_material_id": mat_id,
        "material_name": name,
        "real_name": real_name,
        "is_layer_material": is_layer_material,
        "in_directive_list": in_directive,
        "color_rgba": color_rgba,
        "transparency": transparency,
        "texture": tex_info,
        "erp_material_candidate": erp_candidate,
        "erp_confidence": erp_confidence,
        "verification_status": verification_status,
        "source": "SKP_MATERIAL_OPENSKP",
    })

# Count face usage per material
mat_usage = Counter()
for geom in geometry_records:
    fm = geom.get("face_materials", {})
    for mn, cnt in fm.items():
        mat_usage[mn] += cnt

for mm in material_master:
    mm["face_usage_count"] = mat_usage.get(mm["material_name"], 0)

# Summary
confirmed = [m for m in material_master if m["verification_status"] == "CONFIRMED"]
candidates = [m for m in material_master if m["verification_status"] == "CANDIDATE"]
unmapped = [m for m in material_master if m["verification_status"] == "UNMAPPED"]
layer_mats = [m for m in material_master if m["is_layer_material"]]
color_only = [m for m in material_master if m["verification_status"] == "COLOR_ONLY_NO_MATERIAL"]

LOG("[3F] Material master: " + str(len(material_master)) + " total")
LOG("[3F]   Layer materials (auto): " + str(len(layer_mats)))
LOG("[3F]   Candidates: " + str(len(candidates)))
LOG("[3F]   Color only: " + str(len(color_only)))
LOG("[3F]   Unmapped: " + str(len(unmapped)))

mat_output = {
    "phase": "3F",
    "generated_at": datetime.now().isoformat(),
    "source_sha256": SHA256,
    "summary": {
        "total_materials": len(material_master),
        "layer_materials_auto": len(layer_mats),
        "surface_materials": len(material_master) - len(layer_mats),
        "confirmed": len(confirmed),
        "candidates": len(candidates),
        "unmapped": len(unmapped),
        "color_only": len(color_only),
        "directive_materials_checked": DIRECTIVE_MATERIALS,
        "directive_all_found": all(
            any(d.lower() in m["material_name"].lower() for m in material_master)
            for d in DIRECTIVE_MATERIALS
        ),
    },
    "material_master": material_master,
}

mat_path = os.path.join(OUT_DIR, "material-master.json")
with open(mat_path, 'w', encoding='utf-8') as f:
    json.dump(mat_output, f, indent=2, ensure_ascii=False, default=str)
LOG("[3F] Written: " + mat_path + " (" + str(os.path.getsize(mat_path)) + " bytes)")
LOG("[3F] PHASE 3F STATUS: SUCCESS")
LOG("[3E/3F] COMPLETE")
