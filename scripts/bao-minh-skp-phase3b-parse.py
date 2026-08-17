# -*- coding: utf-8 -*-
"""
BAO MINH CMT8 - PHASE 3B: OpenSKP Independent Parser (CORRECT API)
Uses: SkpFile.open(path).parse() -> SkpModel
Internal units: INCHES (SketchUp internal) → convert to mm for output
READ-ONLY SOURCE. NO DB WRITES.
"""

import sys, io, json, os, traceback, hashlib, math
from datetime import datetime
from collections import defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

SKP_PATH = os.environ.get('BAO_MINH_SKP', '')
if not SKP_PATH or not os.path.exists(SKP_PATH):
    # Unicode path
    for trial in [
        "D:\\\u01b0\u1edcNG HOMEPRO SG\\9. TH\u00c1NG 08.2026\\3. V\u0102N PH\u00d2NG B\u1ea2O MINH\\KHAI TRI\u1ec2N V\u0102N PH\u00d2NG B\u1ea2O MINH.skp",
    ]:
        if os.path.exists(trial):
            SKP_PATH = trial
            break

OUT_DIR = "docs/projects/BAO-MINH-CMT8/sketchup"
OUT_FILE = os.path.join(OUT_DIR, "sketchup-raw-model.json")
LOG = lambda msg: print(msg, flush=True)

INCHES_TO_MM = 25.4

def in_to_mm(v):
    if v is None: return None
    try: return round(float(v) * INCHES_TO_MM, 4)
    except: return None

LOG("[3B] Phase 3B OpenSKP Parser START: " + datetime.now().isoformat())
LOG("[3B] SKP: " + repr(SKP_PATH))

if not SKP_PATH or not os.path.exists(SKP_PATH):
    LOG("[ERROR] SKP not found")
    sys.exit(1)

file_size = os.path.getsize(SKP_PATH)
LOG("[3B] Size: " + str(file_size) + " bytes")

sha = hashlib.sha256()
with open(SKP_PATH, 'rb') as f:
    for chunk in iter(lambda: f.read(65536), b''):
        sha.update(chunk)
sha256_computed = sha.hexdigest().upper()
SHA256_EXPECTED = "664ABC00CB34EE109B7E9830D75B05D9E9921319156320ED29B17755CAC9EF72"
sha256_ok = sha256_computed == SHA256_EXPECTED
LOG("[3B] SHA256: " + sha256_computed + " MATCH=" + str(sha256_ok))
if not sha256_ok:
    LOG("[ERROR] SHA256 mismatch"); sys.exit(1)

from openskp import SkpFile
LOG("[3B] openskp imported OK")

result = {
    "phase": "3B",
    "source_file_repr": repr(SKP_PATH),
    "sha256": sha256_computed, "sha256_verified": sha256_ok,
    "file_size_bytes": file_size,
    "parsed_at": datetime.now().isoformat(),
    "parser": "openskp 0.3.0", "parse_status": "PENDING",
    "errors": [], "warnings": [],
    "sketchup_version": None, "units_from_model": None,
    "internal_unit": "inches (SketchUp internal)",
    "output_unit": "mm (converted, factor 25.4)",
    "layers": [], "materials": [],
    "component_definitions": [], "root_instances": [],
    "geometry_summary": {}
}

try:
    LOG("[3B] Opening SkpFile...")
    skp = SkpFile.open(SKP_PATH)
    LOG("[3B] Parsing model...")
    model = skp.parse()
    LOG("[3B] Model parsed OK — version: " + str(model.version) + ", units: " + str(model.units))

    result["sketchup_version"] = str(model.version)
    result["units_from_model"] = str(model.units)

    # ── LAYERS ──
    layers_out = []
    for layer in model.layers:
        layers_out.append({
            "name": layer.name,
            "color_rgb": [layer.color_r, layer.color_g, layer.color_b],
            "hidden": layer.hidden,
        })
    result["layers"] = layers_out
    LOG("[3B] Layers: " + str(len(layers_out)))

    # ── MATERIALS ──
    materials_out = []
    mat_id_to_name = {}
    for mat_id, mat in model.materials_by_id.items():
        mat_id_to_name[mat_id] = mat.name

    for mat in model.materials:
        tex_info = None
        if mat.texture:
            tex_info = {
                "filename": mat.texture.filename,
                "width_scale_in": mat.texture.width,
                "height_scale_in": mat.texture.height,
                "width_scale_mm": in_to_mm(mat.texture.width),
                "height_scale_mm": in_to_mm(mat.texture.height),
                "has_data": mat.texture.data is not None,
            }
        materials_out.append({
            "id": mat.id,
            "name": mat.name,
            "color_rgba": list(mat.color) if mat.color else None,
            "transparency": mat.transparency,
            "colorized": mat.colorized,
            "colorize_type": mat.colorize_type,
            "texture": tex_info,
        })
    result["materials"] = materials_out
    LOG("[3B] Materials: " + str(len(materials_out)))

    # ── COMPONENT DEFINITIONS ──
    def process_definition(def_id, defn, depth=0):
        vertices = defn.vertices
        edges = defn.edges
        faces = defn.faces

        # Compute bounding box from vertices
        xs = [v.x for v in vertices.values()] if vertices else []
        ys = [v.y for v in vertices.values()] if vertices else []
        zs = [v.z for v in vertices.values()] if vertices else []
        bb = None
        if xs and ys and zs:
            bb = {
                "min_x_in": min(xs), "max_x_in": max(xs),
                "min_y_in": min(ys), "max_y_in": max(ys),
                "min_z_in": min(zs), "max_z_in": max(zs),
                "length_in": max(xs)-min(xs), "width_in": max(ys)-min(ys), "height_in": max(zs)-min(zs),
                "length_mm": in_to_mm(max(xs)-min(xs)),
                "width_mm": in_to_mm(max(ys)-min(ys)),
                "height_mm": in_to_mm(max(zs)-min(zs)),
                "vertex_count": len(xs),
            }

        # Face material stats
        face_mats = defaultdict(int)
        for face in faces.values():
            if face.material_id is not None:
                face_mats[mat_id_to_name.get(face.material_id, str(face.material_id))] += 1

        # Instances (sub-components this definition contains)
        sub_instances = []
        for inst in defn.instances:
            sub_instances.append({
                "name": inst.name,
                "ref_idx": inst.ref_idx,
                "guid": inst.guid,
                "layer": inst.layer,
                "material_id": inst.material_id,
                "material_name": mat_id_to_name.get(inst.material_id, None) if inst.material_id is not None else None,
                "hidden": inst.hidden,
                "matrix_3x4": inst.matrix if inst.matrix else [],
                "properties": inst.properties,
            })

        # Texts and Dimensions
        texts = [{"text": t.text, "hidden": t.hidden} for t in getattr(defn, 'texts', [])]
        dims = [{"text": d.text, "hidden": d.hidden} for d in getattr(defn, 'dimensions', [])]

        return {
            "definition_id": def_id,
            "vertex_count": len(vertices),
            "edge_count": len(edges),
            "face_count": len(faces),
            "sub_instance_count": len(sub_instances),
            "sub_instances": sub_instances,
            "face_materials": dict(face_mats),
            "bounding_box": bb,
            "texts": texts,
            "dimensions": dims,
            "section_planes": [{"plane": sp.plane, "name": sp.name} for sp in getattr(defn, 'section_planes', [])],
        }

    defs_out = []
    for def_id, defn in model.definitions.items():
        d = process_definition(def_id, defn)
        defs_out.append(d)
    result["component_definitions"] = defs_out
    LOG("[3B] Component definitions: " + str(len(defs_out)))

    # ── ROOT ──
    root_processed = process_definition("ROOT", model.root)
    result["root"] = root_processed
    result["root_instances"] = root_processed["sub_instances"]
    LOG("[3B] Root: " + str(len(model.root.instances)) + " top-level instances, " +
        str(len(model.root.vertices)) + " vertices, " +
        str(len(model.root.faces)) + " faces")

    # ── STYLES ──
    styles_out = [{"name": s.name, "front_color": s.front_color, "back_color": s.back_color}
                  for s in model.styles]
    result["styles"] = styles_out

    # ── SUMMARY ──
    total_instances = sum(len(defn.instances) for defn in model.definitions.values()) + len(model.root.instances)
    total_faces = sum(len(defn.faces) for defn in model.definitions.values()) + len(model.root.faces)
    total_verts = sum(len(defn.vertices) for defn in model.definitions.values()) + len(model.root.vertices)
    total_edges = sum(len(defn.edges) for defn in model.definitions.values()) + len(model.root.edges)

    result["geometry_summary"] = {
        "sketchup_version": str(model.version),
        "units_model": str(model.units),
        "layers_count": len(layers_out),
        "materials_count": len(materials_out),
        "component_definitions_count": len(defs_out),
        "root_top_level_instances": len(model.root.instances),
        "total_instances_all_defs": total_instances,
        "total_faces_all_defs": total_faces,
        "total_vertices_all_defs": total_verts,
        "total_edges_all_defs": total_edges,
        "styles_count": len(styles_out),
        "note": "Geometry in definitions; instances reference definitions by ref_idx/guid. Root instances = top-level entities."
    }

    result["parse_status"] = "SUCCESS"
    LOG("[3B] Parse SUCCESS")
    LOG("[3B] Summary: " + json.dumps(result["geometry_summary"], indent=2))

except Exception as e:
    result["parse_status"] = "ERROR"
    result["errors"].append({"stage": "parse", "error": str(e), "traceback": traceback.format_exc()})
    LOG("[3B][ERROR] " + str(e))
    traceback.print_exc()

os.makedirs(OUT_DIR, exist_ok=True)
with open(OUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(result, f, indent=2, ensure_ascii=False, default=str)
fsize = os.path.getsize(OUT_FILE)
LOG("[3B] Written: " + OUT_FILE + " (" + str(fsize) + " bytes)")
LOG("[3B] STATUS: " + result["parse_status"])
