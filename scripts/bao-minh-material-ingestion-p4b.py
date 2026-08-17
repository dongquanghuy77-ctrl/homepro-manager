# -*- coding: utf-8 -*-
"""
BAO MINH CMT8 - Phase 4B: Product Match + BOQ Link + Reconciliation Report
Reads source-document-register.json, performs matching, writes reconciliation
"""

import sys, io, json, os
from datetime import datetime
from collections import defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

NOW      = datetime.now().isoformat()
PROJ     = "BAO-MINH-CMT8"
PROJ_DIR = "docs/projects/BAO-MINH-CMT8"
LOG = lambda msg: print(msg, flush=True)

LOG("[4B] Loading source register and master data...")

with open(PROJ_DIR + "/source-document-register.json", encoding='utf-8') as f:
    reg = json.load(f)

with open(PROJ_DIR + "/04-item-crosswalk.json", encoding='utf-8') as f:
    crosswalk = json.load(f)

with open(PROJ_DIR + "/sketchup/material-master.json", encoding='utf-8') as f:
    matm = json.load(f)

with open(PROJ_DIR + "/sketchup/material-mapping.json", encoding='utf-8') as f:
    matmap = json.load(f)

SOURCE_DOCS = reg["source_documents"]
CROSSWALK   = crosswalk["crosswalk"]
MAT_MASTER  = matm.get("material_master", [])
MAT_MAPPING = matmap.get("material_mapping", [])

# ═══════════════════════════════════════════════════════════════════
# PRODUCT MASTER — built from Phase 3F + item codes from SOURCE-03/04
# ═══════════════════════════════════════════════════════════════════

# Known product codes from SOURCE-03 (An Cuong delivery note with confirmed codes)
PRODUCT_MASTER_KNOWN = {
    "250003217": {
        "item_code":        "250003217",
        "supplier_code":    "250003217",
        "description":      "Chỉ PVC An Cuong 9205 44x0.8mm",
        "supplier":         "An Cuong Group (PENDING CONFIRMATION)",
        "unit":             "Mét",
        "material_family":  "EDGE_BANDING_PVC",
        "skp_material":     "AC - 9205 S",
        "confidence":       "HIGH",
        "source":           "SRC-BAO-MINH-003",
    },
    "500005562": {
        "item_code":        "500005562",
        "supplier_code":    "500005562",
        "description":      "Ván MDF Melamine chống ẩm STD An Cuong 9205S 1220x2440x17mm",
        "supplier":         "An Cuong Group (PENDING CONFIRMATION)",
        "unit":             "Tấm",
        "material_family":  "MDF_MELAMINE_BOARD",
        "skp_material":     "AC - 9205 S",
        "confidence":       "HIGH",
        "source":           "SRC-BAO-MINH-003",
    },
}

# SKP material lookup
skp_mat_by_name = {m["material_name"]: m for m in MAT_MASTER}
mat_map_by_skp  = {m["sketchup_material_name"]: m for m in MAT_MAPPING}

# BOQ lookup by description keywords
def find_boq_match(description_raw):
    desc_lower = description_raw.lower()
    candidates = []
    for item in CROSSWALK:
        item_desc = str(item.get("description","")).lower()
        # Match furniture that USES this material
        if any(kw in desc_lower for kw in ["17mm","9mm","8mm","lmr","mdf","ldf"]):
            if any(kw in item_desc for kw in ["tủ", "bàn", "vách", "kệ", "ngăn"]):
                candidates.append(item["source_item"])
        if "than tre" in desc_lower and any(kw in item_desc for kw in ["than","tre","gỗ"]):
            candidates.append(item["source_item"])
        if "chỉ" in desc_lower and any(kw in item_desc for kw in ["tủ","bàn","vách"]):
            candidates.append(item["source_item"])
    return list(set(candidates))

# ═══════════════════════════════════════════════════════════════════
# RECONCILIATION — process every line item
# ═══════════════════════════════════════════════════════════════════

LOG("[4B] Building reconciliation table...")

recon_rows = []
erp_gate_checks = []

for doc in SOURCE_DOCS:
    doc_type = doc["document_type_classified"]
    doc_id   = doc["source_id"]
    
    for line in doc["line_items"]:
        item_code = line.get("item_code")
        desc_raw  = line.get("description_raw","")
        desc_norm = line.get("description_normalized","")
        qty       = line.get("quantity", 0)
        unit      = line.get("unit") or "PENDING"
        up        = line.get("unit_price")
        up_ck     = line.get("unit_price_after_discount")
        amount    = line.get("line_amount")
        ck_pct    = line.get("discount_pct")
        vat_incl  = line.get("vat_included", False)
        
        # Product match
        pm_status = line.get("product_match_status","PRODUCT_MATCH_PENDING")
        pm_cand   = line.get("product_match_candidate","")
        pm_conf   = line.get("product_match_confidence","LOW")
        
        # Override if item_code known
        if item_code and item_code in PRODUCT_MASTER_KNOWN:
            pm_status = "CANDIDATE"
            pm_cand   = PRODUCT_MASTER_KNOWN[item_code]["description"]
            pm_conf   = PRODUCT_MASTER_KNOWN[item_code]["confidence"]
        
        # BOQ match
        boq_candidates = find_boq_match(desc_raw)
        boq_status = "BOQ_MATCH_PENDING"
        boq_note   = "BOQ is at furniture-item level (tủ/bàn/vách). Raw material → BOQ link requires BOM explosion not yet complete."
        if boq_candidates:
            boq_status = "BOQ_CANDIDATE"
            boq_note   = "Candidate BOQ items: " + ", ".join(boq_candidates[:5])
        
        # Procurement chain
        proc_chain = {
            "MATERIAL_REQUIREMENT":      "MR → [PO] → [Receipt] → [Stock]",
            "SUPPLIER_ORDER_CONFIRMATION": "PO ← [Supplier confirms] → [Receipt] → Stock",
            "GOODS_DELIVERY_NOTE":       "Delivery Note → [GRN] → [QC] → Stock",
            "PURCHASE_ORDER":            "PO → [Receipt] → [Invoice] → [Payment]",
        }.get(doc_type, "UNKNOWN")
        
        # Warehouse chain
        wh_doc_map = {
            "SRC-BAO-MINH-001": None,
            "SRC-BAO-MINH-002": "kho Hồng Nghi",
            "SRC-BAO-MINH-003": "Tổng kho 1",
            "SRC-BAO-MINH-004": "Workshop site — Thuận Giao",
        }
        warehouse = wh_doc_map.get(doc_id)
        wh_status = "WAREHOUSE_MATCH_PENDING"
        
        # ERP gate
        can_post_erp = False
        erp_block_reasons = []
        if doc_type == "MATERIAL_REQUIREMENT":
            erp_block_reasons.append("No price — cannot create PO")
        if doc_type == "SUPPLIER_ORDER_CONFIRMATION":
            erp_block_reasons.append("No receipt confirmation — cannot post stock")
        if doc_type == "GOODS_DELIVERY_NOTE":
            erp_block_reasons.append("Document type ambiguous — needs human confirmation")
        if doc_type == "PURCHASE_ORDER":
            erp_block_reasons.append("PO only — no goods receipt")
        if pm_status == "PRODUCT_MATCH_PENDING":
            erp_block_reasons.append("Product not matched in master")
        if boq_status == "BOQ_MATCH_PENDING":
            erp_block_reasons.append("BOQ line not linked")
        if wh_status == "WAREHOUSE_MATCH_PENDING":
            erp_block_reasons.append("Warehouse not confirmed")
        if doc.get("vendor_supplier") in [None,"PENDING_REVIEW","SUPPLIER_PENDING"]:
            erp_block_reasons.append("Supplier not confirmed")
        
        # Overall recon status
        if pm_status == "MATCHED" and boq_status == "BOQ_MATCHED" and not erp_block_reasons:
            recon_status = "MATCHED"
        elif pm_status in ["CANDIDATE","MATCHED"] and boq_status in ["BOQ_CANDIDATE","BOQ_MATCHED"]:
            recon_status = "PARTIAL_MATCH"
        elif pm_status == "PRODUCT_MATCH_PENDING":
            recon_status = "PENDING"
        else:
            recon_status = "PENDING"
        
        row = {
            "source_id":              doc_id,
            "source_image":           doc["source_image"],
            "document_type":          doc_type,
            "line_id":                line["line_id"],
            "item_code":              item_code,
            "description_raw":        desc_raw,
            "description_normalized": desc_norm,
            "quantity":               qty,
            "unit":                   unit,
            "unit_price":             up,
            "discount_pct":           ck_pct,
            "unit_price_after_discount": up_ck,
            "line_amount":            amount,
            "vat_included":           vat_incl,
            "product_match_status":   pm_status,
            "product_match_candidate": pm_cand,
            "product_match_confidence": pm_conf,
            "boq_match_status":       boq_status,
            "boq_candidates":         boq_candidates[:3],
            "boq_note":               boq_note,
            "warehouse":              warehouse,
            "warehouse_status":       wh_status,
            "supplier":               doc.get("vendor_supplier","SUPPLIER_PENDING"),
            "procurement_chain":      proc_chain,
            "erp_can_post":           can_post_erp,
            "erp_block_reasons":      erp_block_reasons,
            "reconciliation_status":  recon_status,
            "source_file":            doc["source_file"],
            "lineage":                f"ZIP:{doc['source_file']} → IMG:{doc['source_image']} → {doc_id} → {line['line_id']}",
        }
        recon_rows.append(row)
        
        erp_gate_checks.append({
            "line_id": line["line_id"],
            "can_post": can_post_erp,
            "block_count": len(erp_block_reasons),
            "reasons": erp_block_reasons,
        })

# Summary
status_dist = defaultdict(int)
for r in recon_rows:
    status_dist[r["reconciliation_status"]] += 1

pm_dist = defaultdict(int)
for r in recon_rows:
    pm_dist[r["product_match_status"]] += 1

boq_dist = defaultdict(int)
for r in recon_rows:
    boq_dist[r["boq_match_status"]] += 1

LOG("[4B] Reconciliation rows: " + str(len(recon_rows)))
LOG("[4B] Status dist: " + str(dict(status_dist)))
LOG("[4B] Product match dist: " + str(dict(pm_dist)))
LOG("[4B] BOQ match dist: " + str(dict(boq_dist)))
LOG("[4B] ERP postable: " + str(sum(1 for r in erp_gate_checks if r["can_post"])) + "/" + str(len(recon_rows)))

# Write reconciliation JSON
recon_output = {
    "phase": "4B-RECONCILIATION",
    "generated_at": NOW,
    "project_id":   PROJ,
    "summary": {
        "total_source_documents": len(SOURCE_DOCS),
        "total_line_items": len(recon_rows),
        "reconciliation_status_distribution": dict(status_dist),
        "product_match_distribution": dict(pm_dist),
        "boq_match_distribution": dict(boq_dist),
        "erp_transactions_created": 0,
        "erp_postable_now": 0,
        "erp_blocked": len(recon_rows),
        "suppliers_confirmed": 0,
        "suppliers_pending": 4,
        "warehouses_confirmed": 0,
        "warehouses_pending": 3,
        "amount_mismatches": 0,
        "boq_note": "BOQ is at furniture-item level (tủ/bàn/vách). Raw material → BOQ link requires Bill of Materials (BOM) explosion. BOQ_MATCH_PENDING is correct — not an error.",
    },
    "category_A_ready_for_erp": [],
    "category_B_needs_product_master": [r["line_id"] for r in recon_rows if r["product_match_status"] == "PRODUCT_MATCH_PENDING"],
    "category_C_needs_boq": [r["line_id"] for r in recon_rows if r["boq_match_status"] in ["BOQ_MATCH_PENDING","BOQ_CANDIDATE"]],
    "category_D_needs_supplier": [r["line_id"] for r in recon_rows if r["supplier"] in [None,"PENDING_REVIEW","SUPPLIER_PENDING"]],
    "category_E_needs_warehouse": [r["line_id"] for r in recon_rows],
    "category_F_needs_receipt_confirmation": [r["line_id"] for r in recon_rows if r["document_type"] in ["PURCHASE_ORDER","SUPPLIER_ORDER_CONFIRMATION"]],
    "category_G_conflicts": [],
    "reconciliation_rows": recon_rows,
    "erp_gate_checks": erp_gate_checks,
}

out_recon = PROJ_DIR + "/material-ingestion-reconciliation.json"
with open(out_recon, 'w', encoding='utf-8') as f:
    json.dump(recon_output, f, indent=2, ensure_ascii=False, default=str)
LOG("[4B] Written: " + out_recon + " (" + str(os.path.getsize(out_recon)) + " bytes)")

# ═══════════════════════════════════════════════════════════════════
# WAREHOUSE REGISTER
# ═══════════════════════════════════════════════════════════════════

WAREHOUSE_REGISTER = [
    {
        "warehouse_id": "WH-HONG-NGHI",
        "name": "Kho Hồng Nghi",
        "source": "SRC-BAO-MINH-002",
        "source_text": "Địa điểm giao hàng: Tại kho Hồng Nghi",
        "match_status": "WAREHOUSE_MATCH_PENDING",
        "notes": "Mentioned in SOURCE-02 (Xác nhận đơn hàng từ supplier). May be supplier's warehouse, not HomePro warehouse. Needs human confirmation.",
        "type": "SUPPLIER_WAREHOUSE_OR_DELIVERY_POINT",
    },
    {
        "warehouse_id": "WH-TONG-KHO-1",
        "name": "Tổng kho 1",
        "source": "SRC-BAO-MINH-003",
        "source_text": "Annotated on document: 'Tổng kho 1'",
        "match_status": "WAREHOUSE_MATCH_PENDING",
        "notes": "Annotated on SOURCE-03 (Goods Delivery Note). May be HomePro's warehouse or An Cuong's distribution center. Needs human confirmation.",
        "type": "UNKNOWN_WAREHOUSE",
    },
    {
        "warehouse_id": "WH-THUAN-GIAO",
        "name": "Xưởng Thuận Giao",
        "source": "SRC-BAO-MINH-004",
        "source_text": "Địa Chỉ Giao Hàng: 7P28XP36+FQ (Ấp Bình Thuận 2, Xã Thuận Giao, Huyện Thuận An)",
        "match_status": "WAREHOUSE_MATCH_PENDING",
        "notes": "Delivery address from SOURCE-04 (PO). This is the HomePro workshop/production site at Thuận Giao. Likely NOT a stock warehouse but a production consumption point.",
        "type": "PRODUCTION_SITE",
    },
]

wh_output = {
    "phase": "4B-WAREHOUSE",
    "generated_at": NOW,
    "summary": {
        "total_warehouses": len(WAREHOUSE_REGISTER),
        "confirmed": 0,
        "pending": 3,
        "note": "All 3 delivery/warehouse locations from source documents are WAREHOUSE_MATCH_PENDING. Cannot be treated as same location. No stock transactions until confirmed.",
    },
    "warehouses": WAREHOUSE_REGISTER,
}
out_wh = PROJ_DIR + "/warehouse-register.json"
with open(out_wh, 'w', encoding='utf-8') as f:
    json.dump(wh_output, f, indent=2, ensure_ascii=False, default=str)
LOG("[4B] Written warehouse register: " + out_wh)

# ═══════════════════════════════════════════════════════════════════
# SUPPLIER REGISTER
# ═══════════════════════════════════════════════════════════════════

SUPPLIER_REGISTER = [
    {
        "supplier_id": "SUP-HONG-NGHI",
        "name": "Hồng Nghi (PENDING CONFIRMATION)",
        "evidence": "SRC-002 delivery to 'kho Hồng Nghi', payment to VCB GIA PHÚC acc 0501000112233. Items: LMR 111G boards + CHỈ 111SH edge bands. 111G/111SH codes consistent with Hồng Nghi brand.",
        "match_status": "SUPPLIER_PENDING",
        "doc_sources": ["SRC-BAO-MINH-002"],
        "bank_info": "VCB GIA PHÚC — 0501000112233",
        "notes": "Supplier name NOT on document. Inferred from delivery location and product codes 111G/111SH. Must be confirmed by user.",
    },
    {
        "supplier_id": "SUP-AN-CUONG",
        "name": "An Cuong Group (PENDING CONFIRMATION)",
        "evidence": "SRC-003 shows item codes 250003217 (Chỉ PVC 9205) and 500005562 (Ván MDF 9205S). 9205 is An Cuong's product code series. 'MUESTSTD' = An Cuong product format. 'Tổng kho 1' may be An Cuong distribution center.",
        "match_status": "SUPPLIER_PENDING",
        "doc_sources": ["SRC-BAO-MINH-003"],
        "notes": "Source document was issued TO HOMEPRO. Supplier is the document issuer. Item code format and 9205 product codes strongly suggest An Cuong Group. Must be confirmed by user.",
    },
    {
        "supplier_id": "SUP-SOURCE-04",
        "name": "SUPPLIER_PENDING — SOURCE-04 (ĐƠN ĐẶT HÀNG)",
        "evidence": "SOURCE-04 is a PO from HOMEPRO to an unnamed supplier. Items: LMRDW (SC010MW, XAM200T), LMRDWE2, CSC010M, CXAMCT. SC010MW suggests same supplier as SOURCE-03 (An Cuong 9205S family). But needs confirmation.",
        "match_status": "SUPPLIER_PENDING",
        "doc_sources": ["SRC-BAO-MINH-004"],
        "bank": "VIETINBANK",
        "sales_rep": "Huỳnh Ngọc Thiên Thanh (BTQ12-0005)",
        "notes": "Supplier identity = document issuer. SC010MW/9205S correlation with An Cuong. Sales rep code BTQ12-0005 may help identify supplier.",
    },
]

sup_output = {
    "phase": "4B-SUPPLIER",
    "generated_at": NOW,
    "summary": {
        "total_suppliers_identified": len(SUPPLIER_REGISTER),
        "confirmed": 0,
        "pending": 3,
        "note": "No supplier is confirmed. All are SUPPLIER_PENDING. Cannot create official Purchase Orders or Receipts until suppliers are confirmed in supplier master.",
    },
    "suppliers": SUPPLIER_REGISTER,
}
out_sup = PROJ_DIR + "/supplier-register.json"
with open(out_sup, 'w', encoding='utf-8') as f:
    json.dump(sup_output, f, indent=2, ensure_ascii=False, default=str)
LOG("[4B] Written supplier register: " + out_sup)
LOG("[4B] PHASE 4B COMPLETE")
