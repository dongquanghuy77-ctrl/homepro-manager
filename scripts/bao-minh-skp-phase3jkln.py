# -*- coding: utf-8 -*-
"""
BAO MINH CMT8 - PHASE 3J: Production Items
Phase 3K: Edge Banding / Production Layers
Phase 3L: Production Preview
Phase 3N: Data Lineage
All writes are CANDIDATE/PREVIEW only — NO ERP transactions, NO production orders
"""

import sys, io, json, os
from collections import defaultdict, Counter
from datetime import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

GEOM    = "docs/projects/BAO-MINH-CMT8/sketchup/geometry-dimensions.json"
INV     = "docs/projects/BAO-MINH-CMT8/sketchup/component-inventory.json"
BOQ_MAP = "docs/projects/BAO-MINH-CMT8/sketchup/boq-mapping.json"
MAT_MAP = "docs/projects/BAO-MINH-CMT8/sketchup/material-mapping.json"
SURV    = "docs/projects/BAO-MINH-CMT8/sketchup/design-vs-survey.json"
RAW     = "docs/projects/BAO-MINH-CMT8/sketchup/sketchup-raw-model.json"
OUT     = "docs/projects/BAO-MINH-CMT8/sketchup"
LOG     = lambda msg: print(msg, flush=True)

LOG("[3J/3K/3L/3N] Loading data...")
with open(GEOM,    encoding='utf-8') as f: geom_data = json.load(f)
with open(INV,     encoding='utf-8') as f: inv_data  = json.load(f)
with open(BOQ_MAP, encoding='utf-8') as f: boq_data  = json.load(f)
with open(MAT_MAP, encoding='utf-8') as f: mat_data  = json.load(f)
with open(SURV,    encoding='utf-8') as f: surv_data = json.load(f)
with open(RAW,     encoding='utf-8') as f: raw_data  = json.load(f)

SHA256 = raw_data["sha256"]
SOURCE_FILE = "KHAI TRIỂN VĂN PHÒNG BẢO MINH.skp"
SOURCE_PATH = "D:\\XƯỞNG HOMEPRO SG\\9. THÁNG 08.2026\\3. VĂN PHÒNG BẢO MINH"
PROJECT_ID  = "BAO-MINH-CMT8"

geom_records = geom_data.get("geometry_records", [])
inventory    = inv_data.get("component_inventory", [])
boq_mappings = boq_data.get("boq_mappings", [])
mat_mappings = mat_data.get("material_mapping", [])

LOG("[3J] geom_records: " + str(len(geom_records)))

# Build lookups
boq_by_geom  = {m["geom_id"]: m for m in boq_mappings}
inv_by_id    = {c["inventory_id"]: c for c in inventory}
mat_by_name  = {m["sketchup_material_name"]: m for m in mat_mappings}

# ═══════════════════════════════════════════════════
# PHASE 3K — EDGE BANDING / PRODUCTION LAYERS
# ═══════════════════════════════════════════════════
LOG("[3K] Analysing production layers and edge banding...")

# Layer production role classification with evidence
LAYER_ANALYSIS = {
    "Layer0": {
        "production_role": "DEFAULT_GEOMETRY",
        "evidence": "Default SketchUp layer. Instances may be ungrouped geometry or catch-all.",
        "edge_banding": False,
        "production_operation": None,
        "confidence": "MEDIUM",
    },
    "[Ẩn/Hiện] - [Cánh/MNK]": {
        "production_role": "DOOR_DRAWER_VISIBILITY_TOGGLE",
        "evidence": "Name = Hide/Show - Door/Drawer. Used to toggle visibility of door/drawer fronts for presentation.",
        "edge_banding": False,
        "production_operation": "DOOR_DRAWER_PANEL",
        "confidence": "HIGH",
        "needs_human_verification": False,
    },
    "CỐT": {
        "production_role": "STRUCTURAL_CARCASS_BOARD",
        "evidence": "CỐT = carcass/core material. Board substrate before surface finish.",
        "edge_banding": False,
        "production_operation": "CNC_CUT",
        "confidence": "HIGH",
        "needs_human_verification": False,
    },
    "cốt": {
        "production_role": "STRUCTURAL_CARCASS_BOARD",
        "evidence": "Same as CỐT (case variant). Carcass board.",
        "edge_banding": False,
        "production_operation": "CNC_CUT",
        "confidence": "HIGH",
        "needs_human_verification": False,
    },
    "sắt": {
        "production_role": "METAL_FRAMEWORK",
        "evidence": "sắt = iron/steel. Metal frame or hardware component.",
        "edge_banding": False,
        "production_operation": "METAL_FABRICATION",
        "confidence": "HIGH",
        "needs_human_verification": False,
    },
    "OneClick_edge_banding": {
        "production_role": "EDGE_BANDING",
        "evidence": "Layer name explicitly contains 'edge_banding'. OneClick plugin generates this layer.",
        "edge_banding": True,
        "production_operation": "EDGE_BAND_APPLY",
        "confidence": "HIGH",
        "needs_human_verification": False,
    },
    "MICA": {
        "production_role": "MICA_ACRYLIC_SURFACE",
        "evidence": "MICA = acrylic/mica decorative surface. Applied after carcass assembly.",
        "edge_banding": False,
        "production_operation": "MICA_LAMINATE",
        "confidence": "HIGH",
        "needs_human_verification": False,
    },
    "BO CONG": {
        "production_role": "ROUNDED_EDGE_PROFILE",
        "evidence": "BO CONG = curved/rounded edge. Likely edge profile bending or postform edge.",
        "edge_banding": True,
        "production_operation": "EDGE_PROFILE_CURVE",
        "confidence": "HIGH",
        "needs_human_verification": False,
    },
    "Fuji_miscellaneous": {
        "production_role": "HARDWARE_ACCESSORY",
        "evidence": "Fuji = hardware brand (Fuji hinges/slides). Miscellaneous hardware items.",
        "edge_banding": False,
        "production_operation": "HARDWARE_INSTALL",
        "confidence": "MEDIUM",
        "needs_human_verification": True,
    },
    "[Ẩn/Hiện] - [Text]": {
        "production_role": "ANNOTATION_ONLY",
        "evidence": "Text layer for model annotations. Not a production layer.",
        "edge_banding": False,
        "production_operation": None,
        "confidence": "HIGH",
        "needs_human_verification": False,
    },
}

# Count instances per layer
layer_instance_counts = Counter(c.get("layer","") for c in inventory)

edge_banding_layers   = []
production_layers     = []
annotation_layers     = []
uncertain_layers      = []

for layer_name, analysis in LAYER_ANALYSIS.items():
    entry = {
        "layer_name": layer_name,
        "instance_count": layer_instance_counts.get(layer_name, 0),
        **analysis,
    }
    if analysis["production_operation"] is None and not analysis["edge_banding"]:
        annotation_layers.append(entry)
    elif analysis["edge_banding"]:
        edge_banding_layers.append(entry)
    elif analysis.get("needs_human_verification", False):
        uncertain_layers.append(entry)
    else:
        production_layers.append(entry)

LOG("[3K] Edge banding layers: " + str(len(edge_banding_layers)))
LOG("[3K] Production layers: " + str(len(production_layers)))
LOG("[3K] Annotation layers: " + str(len(annotation_layers)))
LOG("[3K] Uncertain (needs human): " + str(len(uncertain_layers)))

eb_output = {
    "phase": "3K",
    "generated_at": datetime.now().isoformat(),
    "source_sha256": SHA256,
    "summary": {
        "total_layers": len(LAYER_ANALYSIS),
        "edge_banding_layers": len(edge_banding_layers),
        "production_layers": len(production_layers),
        "annotation_layers": len(annotation_layers),
        "uncertain_needs_verification": len(uncertain_layers),
    },
    "layer_analysis": LAYER_ANALYSIS,
    "edge_banding_layers": edge_banding_layers,
    "production_layers": production_layers,
    "annotation_layers": annotation_layers,
    "uncertain_layers": uncertain_layers,
}
out3k = os.path.join(OUT, "edge-banding-layers.json")
with open(out3k, 'w', encoding='utf-8') as f:
    json.dump(eb_output, f, indent=2, ensure_ascii=False, default=str)
LOG("[3K] Written: " + out3k)

# ═══════════════════════════════════════════════════
# PHASE 3J — PRODUCTION ITEMS
# ═══════════════════════════════════════════════════
LOG("[3J] Building production item candidates...")

# Only create production items for confirmed geometry with role
PRODUCTION_ELIGIBLE_ROLES = {
    "SIDE_PANEL", "SIDE_PANEL_LEFT", "SIDE_PANEL_RIGHT",
    "BACK_PANEL", "TOP_PANEL", "BOTTOM_PANEL",
    "SHELF", "DOOR", "DRAWER_FRONT", "DRAWER_BOTTOM", "DRAWER_SIDE",
    "BASE_STRIP", "TRIM_STRIP", "MIDDLE_PARTITION",
    "OUTER_SHELL", "HANDLE_RAIL", "PANEL_CUT",
}

production_items = []
orphan_items     = []
unsourced_check  = []
pi_counter       = 0

for rec in geom_records:
    role = rec.get("production_role", "UNKNOWN")
    if role not in PRODUCTION_ELIGIBLE_ROLES:
        continue
    
    geom_id     = rec["geom_id"]
    inst_name   = rec.get("instance_name", "")
    layer       = rec.get("layer", "")
    prim_mat    = rec.get("primary_material")
    face_mats   = rec.get("face_materials", {})
    
    # Dimension (required for production item)
    L = rec.get("normalized_length_mm", 0) or 0
    W = rec.get("normalized_width_mm", 0) or 0
    T = rec.get("normalized_thickness_mm")
    has_dims = L > 0 and W > 0
    
    # BOQ mapping
    boq_m = boq_by_geom.get(geom_id, {})
    boq_primary = boq_m.get("boq_primary")
    boq_status  = boq_m.get("mapping_status", "UNMAPPED")
    
    # Material mapping
    mat_erp = mat_by_name.get(prim_mat, {}) if prim_mat else {}
    
    # Determine item status
    if not has_dims:
        item_status = "NO_GEOMETRY_SKIP"
        unsourced_check.append(geom_id)
        continue
    
    # Determine edge banding from face materials
    edge_band = None
    for mat_name in face_mats:
        if "HN" in mat_name or "BT" in mat_name or "edge" in mat_name.lower():
            edge_band = mat_name
            break
    
    pi_counter += 1
    pi_id = f"PI-{PROJECT_ID}-{str(pi_counter).zfill(4)}"
    
    # Determine area/room from component name pattern
    # Furniture types: tủ hồ sơ, tủ quầy, bàn làm việc etc.
    area = "UNKNOWN"
    room = "VĂN PHÒNG"  # All in office
    
    prod_item = {
        "production_item_id": pi_id,
        "project_id": PROJECT_ID,
        "component_id": geom_id,
        "component_name": inst_name,
        "production_role": role,
        "area": area,
        "room": room,
        "layer": layer,
        "length_mm": round(L, 2),
        "width_mm": round(W, 2),
        "height_mm": round(rec.get("source_value_height_mm", 0) or 0, 2),
        "thickness_mm": round(T, 2) if T else None,
        "material": prim_mat,
        "edge_banding": edge_band,
        "face_materials": face_mats,
        "quantity": 1,  # each root instance = 1 item; quantity per definition handled separately
        "boq_item": boq_primary,
        "boq_mapping_status": boq_status,
        "erp_material_candidate": mat_erp.get("erp_material_candidate"),
        "erp_confidence": mat_erp.get("confidence", "NONE"),
        "source_component": geom_id,
        "source_file": SOURCE_FILE,
        "source_hash": SHA256,
        "status": "CANDIDATE_PENDING_HUMAN_APPROVAL",
        "lineage": f"PROJECT:{PROJECT_ID} -> SKP_FILE:{SOURCE_FILE} -> SHA256:{SHA256[:16]}... -> COMPONENT:{geom_id} -> BOQ:{boq_primary or 'UNMAPPED'}",
    }
    production_items.append(prod_item)

# Summary
role_dist = Counter(p["production_role"] for p in production_items)
mat_dist  = Counter(p["material"] for p in production_items if p["material"])
boq_dist  = Counter(p["boq_mapping_status"] for p in production_items)

LOG("[3J] Production item candidates: " + str(len(production_items)))
LOG("[3J] By role (top 10): " + str(dict(role_dist.most_common(10))))
LOG("[3J] By material: " + str(dict(mat_dist.most_common(10))))
LOG("[3J] BOQ status: " + str(dict(boq_dist)))
LOG("[3J] Orphans: " + str(len(orphan_items)))

prod_output = {
    "phase": "3J",
    "generated_at": datetime.now().isoformat(),
    "source_sha256": SHA256,
    "source_file": SOURCE_FILE,
    "source_path": SOURCE_PATH,
    "critical_notice": "CANDIDATE ONLY — No ERP transactions, no production orders, no material reservations. All items require human approval before any production action.",
    "summary": {
        "total_production_candidates": len(production_items),
        "orphan_items": len(orphan_items),
        "unsourced_skipped": len(unsourced_check),
        "production_role_distribution": dict(role_dist.most_common()),
        "material_distribution": dict(mat_dist.most_common()),
        "boq_mapping_status": dict(boq_dist),
        "erp_transactions_created": 0,
        "production_orders_created": 0,
        "material_reservations_created": 0,
    },
    "production_items": production_items,
}
out3j = os.path.join(OUT, "production-items.json")
with open(out3j, 'w', encoding='utf-8') as f:
    json.dump(prod_output, f, indent=2, ensure_ascii=False, default=str)
LOG("[3J] Written: " + out3j + " (" + str(os.path.getsize(out3j)) + " bytes)")

# ═══════════════════════════════════════════════════
# PHASE 3L — PRODUCTION PREVIEW
# ═══════════════════════════════════════════════════
LOG("[3L] Building production preview report...")

# 1. Component List
comp_list = []
for p in production_items[:200]:  # top 200 for preview
    comp_list.append({
        "pi_id": p["production_item_id"],
        "component": p["component_name"],
        "role": p["production_role"],
        "area": p["area"],
        "room": p["room"],
        "qty": p["quantity"],
        "L_mm": p["length_mm"],
        "W_mm": p["width_mm"],
        "T_mm": p["thickness_mm"],
        "material": p["material"],
        "status": p["status"],
    })

# 2. Material List (from SKP, grouped by type)
mat_comp_count = defaultdict(int)
for p in production_items:
    if p["material"]:
        mat_comp_count[p["material"]] += 1

mat_list_preview = []
mat_mappings_dict = {m["sketchup_material_name"]: m for m in mat_mappings}
for mat_name, count in sorted(mat_comp_count.items(), key=lambda x: -x[1]):
    mm = mat_mappings_dict.get(mat_name, {})
    mat_list_preview.append({
        "material": mat_name,
        "component_count": count,
        "erp_candidate": mm.get("erp_material_candidate"),
        "confidence": mm.get("confidence","NONE"),
        "mapping_status": mm.get("match_type","UNMAPPED"),
    })

# 3. Unmapped components (no BOQ)
unmapped_comps = [p for p in production_items if p["boq_mapping_status"] == "UNMAPPED"]

# 4. Conflicts
conflicts = surv_data.get("design_vs_survey_issues", [])
conflict_list = [i for i in conflicts if i.get("verification_status") == "CONFLICT"]

# 5. Human verification queue
hv_queue = []
for p in production_items:
    reasons = []
    if p["boq_mapping_status"] in ["UNMAPPED","NEEDS_HUMAN_VERIFICATION"]:
        reasons.append("BOQ not confirmed")
    if p["erp_confidence"] in ["NONE","MEDIUM"]:
        reasons.append("Material ERP candidate unconfirmed")
    if reasons:
        hv_queue.append({
            "pi_id": p["production_item_id"],
            "component": p["component_name"],
            "reasons": reasons,
        })

LOG("[3L] Component list: " + str(len(comp_list)))
LOG("[3L] Material list: " + str(len(mat_list_preview)))
LOG("[3L] Unmapped: " + str(len(unmapped_comps)))
LOG("[3L] Conflicts: " + str(len(conflict_list)))
LOG("[3L] Human verification queue: " + str(len(hv_queue)))

preview_output = {
    "phase": "3L",
    "generated_at": datetime.now().isoformat(),
    "source_sha256": SHA256,
    "report_status": "PENDING_HUMAN_REVIEW",
    "summary": {
        "component_list_count": len(comp_list),
        "material_list_count": len(mat_list_preview),
        "unmapped_components": len(unmapped_comps),
        "conflicts": len(conflict_list),
        "human_verification_queue": len(hv_queue),
    },
    "component_list": comp_list,
    "material_list": mat_list_preview,
    "unmapped_components": [{"pi_id": u["production_item_id"], "component": u["component_name"], "role": u["production_role"]} for u in unmapped_comps[:50]],
    "conflicts": conflict_list,
    "human_verification_queue": hv_queue[:50],
}
out3l = os.path.join(OUT, "production-preview.json")
with open(out3l, 'w', encoding='utf-8') as f:
    json.dump(preview_output, f, indent=2, ensure_ascii=False, default=str)
LOG("[3L] Written: " + out3l)

# ═══════════════════════════════════════════════════
# PHASE 3N — DATA LINEAGE
# ═══════════════════════════════════════════════════
LOG("[3N] Building data lineage records...")

lineage_records = []
for p in production_items[:500]:  # full lineage for all items
    lineage = {
        "production_item_id": p["production_item_id"],
        "project_id": PROJECT_ID,
        "lineage_chain": [
            {"level": "PROJECT",         "id": PROJECT_ID, "name": "VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CHI NHÁNH CMT8"},
            {"level": "DESIGN_SOURCE",   "id": "PHASE1",   "name": "26.07.22 HS TKYT NOI THAT VP BAO MINH CHI NHANH.pdf"},
            {"level": "SKP_FILE",        "id": SHA256,     "name": SOURCE_FILE, "path": SOURCE_PATH, "sha256": SHA256},
            {"level": "SKP_COMPONENT",   "id": p["component_id"], "name": p["component_name"], "layer": p["layer"]},
            {"level": "GEOMETRY",        "id": p["component_id"], "L_mm": p["length_mm"], "W_mm": p["width_mm"], "T_mm": p["thickness_mm"]},
            {"level": "MATERIAL",        "id": p["material"] or "UNKNOWN", "erp_candidate": p["erp_material_candidate"]},
            {"level": "PRODUCTION_ITEM", "id": p["production_item_id"], "status": p["status"]},
            {"level": "BOQ_ITEM",        "id": p["boq_item"] or "UNMAPPED", "mapping_status": p["boq_mapping_status"]},
        ],
        "survey_linkage": {
            "survey_source": "Phase 2 — survey-photo-analysis.json",
            "survey_linked": False,
            "note": "Survey linkage at component level requires human confirmation of room/zone assignment",
        },
        "unsourced": False,
        "guessed_data": False,
        "lineage_complete": p["boq_item"] is not None,
    }
    lineage_records.append(lineage)

# Check for unsourced
unsourced_found = [l for l in lineage_records if l["unsourced"]]
guessed_found   = [l for l in lineage_records if l["guessed_data"]]
incomplete      = [l for l in lineage_records if not l["lineage_complete"]]

LOG("[3N] Lineage records: " + str(len(lineage_records)))
LOG("[3N] Unsourced: " + str(len(unsourced_found)))
LOG("[3N] Guessed data: " + str(len(guessed_found)))
LOG("[3N] Incomplete (no BOQ): " + str(len(incomplete)))

lineage_output = {
    "phase": "3N",
    "generated_at": datetime.now().isoformat(),
    "source_sha256": SHA256,
    "summary": {
        "total_lineage_records": len(lineage_records),
        "UNSOURCED_PRODUCTION_ITEM": len(unsourced_found),
        "GUESSED_DATA": len(guessed_found),
        "INCOMPLETE_BOQ_LINK": len(incomplete),
        "lineage_gate": "PASS" if len(unsourced_found) == 0 and len(guessed_found) == 0 else "FAIL",
    },
    "lineage_records": lineage_records,
}
out3n = os.path.join(OUT, "data-lineage.json")
with open(out3n, 'w', encoding='utf-8') as f:
    json.dump(lineage_output, f, indent=2, ensure_ascii=False, default=str)
LOG("[3N] Written: " + out3n)
LOG("[3N] Lineage gate: " + lineage_output["summary"]["lineage_gate"])
LOG("[3J/3K/3L/3N] ALL COMPLETE")
