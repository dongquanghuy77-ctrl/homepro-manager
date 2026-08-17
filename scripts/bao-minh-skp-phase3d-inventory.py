# -*- coding: utf-8 -*-
"""
BAO MINH CMT8 - PHASE 3D: Component Inventory Analysis
Reads sketchup-raw-model.json, builds full component inventory
"""

import sys, io, json, os
from collections import Counter, defaultdict
from datetime import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

RAW = "docs/projects/BAO-MINH-CMT8/sketchup/sketchup-raw-model.json"
OUT_DIR = "docs/projects/BAO-MINH-CMT8/sketchup"
LOG = lambda msg: print(msg, flush=True)

LOG("[3D] Loading raw model...")
with open(RAW, encoding='utf-8') as f:
    d = json.load(f)

LOG("[3D] Loaded. Parse status: " + d["parse_status"])

root_insts = d.get("root_instances", [])
defs = d.get("component_definitions", [])
materials = d.get("materials", [])
layers = d.get("layers", [])

LOG("[3D] root_instances: " + str(len(root_insts)))
LOG("[3D] defs: " + str(len(defs)))

# ── LAYER ANALYSIS ──
layer_count = Counter(i.get("layer","") for i in root_insts)
LOG("[3D] Layer distribution: " + str(dict(layer_count)))

# ── INSTANCE NAME ANALYSIS ──
name_count = Counter(i.get("name","") for i in root_insts)
named_instances = [(k,v) for k,v in sorted(name_count.items(), key=lambda x:-x[1]) if k]
LOG("[3D] Named root instances: " + str(named_instances[:30]))

# ── DEFINITION ANALYSIS ──
# Build def_id -> def map
def_map = {dd["definition_id"]: dd for dd in defs}

# Find production-relevant definitions (have faces and/or bounding box)
prod_defs = []
for dd in defs:
    bb = dd.get("bounding_box")
    if not bb:
        continue
    l_mm = bb.get("length_mm", 0) or 0
    w_mm = bb.get("width_mm", 0) or 0
    h_mm = bb.get("height_mm", 0) or 0
    if l_mm < 0.1 and w_mm < 0.1 and h_mm < 0.1:
        continue  # skip zero-size
    prod_defs.append({
        "def_id": dd["definition_id"],
        "vertex_count": dd["vertex_count"],
        "edge_count": dd["edge_count"],
        "face_count": dd["face_count"],
        "sub_instance_count": dd["sub_instance_count"],
        "length_mm": round(l_mm, 2),
        "width_mm": round(w_mm, 2),
        "height_mm": round(h_mm, 2),
        "face_materials": dd.get("face_materials", {}),
        "sub_instances": dd.get("sub_instances", []),
        "texts": dd.get("texts", []),
        "dimensions": dd.get("dimensions", []),
    })

LOG("[3D] Definitions with geometry: " + str(len(prod_defs)))

# ── COMPONENT HIERARCHY FROM ROOT ──
# Map ref_idx to definition
ref_to_def = {}
for i, dd in enumerate(defs):
    ref_to_def[i] = dd["definition_id"]
    ref_to_def[dd["definition_id"]] = dd["definition_id"]

# Root instances -> components
components_inventory = []
layer_layer_prefix = "Layer_"

for idx, inst in enumerate(root_insts):
    ref = inst.get("ref_idx")
    def_id = ref_to_def.get(ref) if ref is not None else None
    dd = def_map.get(def_id) if def_id else None

    bb = dd.get("bounding_box") if dd else None
    face_count = dd.get("face_count", 0) if dd else 0
    sub_count = dd.get("sub_instance_count", 0) if dd else 0
    face_mats = dd.get("face_materials", {}) if dd else {}

    layer = inst.get("layer", "")
    mat_id = inst.get("material_id")
    mat_name = inst.get("material_name", "")
    name = inst.get("name", "")
    hidden = inst.get("hidden", False)
    matrix = inst.get("matrix_3x4", [])
    props = inst.get("properties", {})

    # Determine component type from layer
    comp_type = "UNKNOWN"
    if layer in ["CỐT", "cốt"]:
        comp_type = "PANEL_CUT" # Tấm cốt (board panels)
    elif layer == "sắt":
        comp_type = "METAL_FRAME"
    elif layer == "OneClick_edge_banding":
        comp_type = "EDGE_BANDING"
    elif layer == "MICA":
        comp_type = "MICA_SURFACE"
    elif layer == "BO CONG":
        comp_type = "ROUNDED_EDGE"
    elif layer == "Fuji_miscellaneous":
        comp_type = "HARDWARE_MISC"
    elif layer == "[Ẩn/Hiện] - [Cánh/MNK]":
        comp_type = "DOOR_DRAWER"
    elif layer == "[Ẩn/Hiện] - [Text]":
        comp_type = "ANNOTATION"
    elif layer == "Layer0":
        comp_type = "DEFAULT_LAYER"

    entry = {
        "inventory_id": "INV-" + str(idx).zfill(4),
        "root_instance_index": idx,
        "instance_name": name,
        "ref_idx": ref,
        "definition_id": def_id,
        "layer": layer,
        "component_type": comp_type,
        "material_id": mat_id,
        "material_name": mat_name,
        "hidden": hidden,
        "face_count": face_count,
        "sub_components": sub_count,
        "face_materials": face_mats,
        "properties": props,
    }

    if bb:
        entry["bounding_box"] = {
            "length_mm": round(bb.get("length_mm", 0) or 0, 2),
            "width_mm": round(bb.get("width_mm", 0) or 0, 2),
            "height_mm": round(bb.get("height_mm", 0) or 0, 2),
            "vertex_count": bb.get("vertex_count", 0),
        }

    if matrix:
        entry["matrix_3x4"] = matrix

    components_inventory.append(entry)

# ── STATISTICS ──
type_counts = Counter(c["component_type"] for c in components_inventory)
layer_stats = Counter(c["layer"] for c in components_inventory)
hidden_count = sum(1 for c in components_inventory if c["hidden"])
visible_count = len(components_inventory) - hidden_count
has_bb = sum(1 for c in components_inventory if "bounding_box" in c)
has_name = sum(1 for c in components_inventory if c["instance_name"])

LOG("[3D] Component types: " + str(dict(type_counts)))
LOG("[3D] Hidden: " + str(hidden_count) + " Visible: " + str(visible_count))
LOG("[3D] Has bounding box: " + str(has_bb))
LOG("[3D] Has instance name: " + str(has_name))

# ── PRODUCTION-RELEVANT PANEL ANALYSIS ──
panel_components = [c for c in components_inventory if c["component_type"] in
                    ["PANEL_CUT", "METAL_FRAME", "MICA_SURFACE", "DOOR_DRAWER", "EDGE_BANDING"]]
LOG("[3D] Production-relevant components: " + str(len(panel_components)))

# ── DEFINITION USAGE COUNT ──
def_usage = Counter(c["definition_id"] for c in components_inventory if c["definition_id"] is not None)
LOG("[3D] Top 20 most-used definitions:")
for def_id, count in def_usage.most_common(20):
    dd = def_map.get(def_id, {})
    bb = dd.get("bounding_box") or {}
    LOG("  def_id=" + str(def_id) + " count=" + str(count) +
        " L=" + str(round(bb.get("length_mm",0) or 0, 1)) +
        " W=" + str(round(bb.get("width_mm",0) or 0, 1)) +
        " H=" + str(round(bb.get("height_mm",0) or 0, 1)) + "mm")

# ── OUTPUT ──
output = {
    "phase": "3D",
    "generated_at": datetime.now().isoformat(),
    "source_sha256": d["sha256"],
    "source_file": d["source_file_repr"],
    "summary": {
        "total_root_instances": len(root_insts),
        "total_definitions": len(defs),
        "definitions_with_geometry": len(prod_defs),
        "component_types": dict(type_counts),
        "layer_distribution": dict(layer_stats),
        "hidden_instances": hidden_count,
        "visible_instances": visible_count,
        "instances_with_bounding_box": has_bb,
        "instances_with_name": has_name,
        "production_relevant_count": len(panel_components),
    },
    "layer_definitions": [{"name": l["name"], "color_rgb": l["color_rgb"], "hidden": l["hidden"]} for l in layers],
    "material_list": [{"id": m["id"], "name": m["name"], "texture": m.get("texture"), "color_rgba": m.get("color_rgba")} for m in materials],
    "component_inventory": components_inventory,
    "production_definitions": prod_defs[:200],  # top 200 by geometry
    "definition_usage_rank": [{"definition_id": k, "usage_count": v} for k, v in def_usage.most_common(50)],
}

out_path = os.path.join(OUT_DIR, "component-inventory.json")
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2, ensure_ascii=False, default=str)
LOG("[3D] Written: " + out_path + " (" + str(os.path.getsize(out_path)) + " bytes)")
LOG("[3D] PHASE 3D STATUS: SUCCESS")
