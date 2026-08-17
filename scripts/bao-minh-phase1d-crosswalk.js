/**
 * BAO MINH CMT8 — PHASE 1D: ITEM CROSSWALK
 * Đối chiếu KL Excel (82 items đã reconcile) với Technical PDF drawing register.
 *
 * KL Excel items → DIRECTIVE DRAWING MAPPING → STATUS
 *
 * KHÔNG tự sửa conflict.
 * Mọi QTY_CONFLICT/MATERIAL_CONFLICT → REVIEW QUEUE.
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const OUT_DIR = 'docs/projects/BAO-MINH-CMT8';

// ════════════════════════════════════════════
// 82 NORMALIZED ITEMS từ PHASE 1 KL EXCEL
// Source: reconciliation-gate.json + PHASE1-ITEM-MASTER.xlsx
// ════════════════════════════════════════════
const KL_ITEMS = [
  // SECTION A — PHÒNG HỌP
  { item_no:'A.I.1',   scope:'HOMEPRO', room:'Phòng Họp',      desc:'Thảm trải sàn',                    dvt:'m2',  qty:24.15,   qty_note:'net=23 ×1.05',  pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R9/R10'   },
  { item_no:'A.I.2',   scope:'HOMEPRO', room:'Phòng Họp',      desc:'Len chân tường',                   dvt:'md',  qty:15.75,   qty_note:'net=15 ×1.05',  pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R11/R12'  },
  { item_no:'A.I.3',   scope:'HOMEPRO', room:'Phòng Họp',      desc:'Rèm che nắng',                     dvt:'m2',  qty:5.8,     qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R13/R14'  },
  { item_no:'A.I.4',   scope:'HOMEPRO', room:'Phòng Họp',      desc:'Vách ốp gỗ',                       dvt:'m2',  qty:7.2675,  qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'YES', src_row:'R15'      },
  { item_no:'A.I.5',   scope:'HOMEPRO', room:'Phòng Họp',      desc:'Nẹp T inox ron vách gỗ',           dvt:'md',  qty:7.95,    qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R16'      },
  { item_no:'A.II.1',  scope:'HOMEPRO', room:'Phòng Họp',      desc:'Bàn họp D3200×R1400×C750mm',       dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R18'      },
  { item_no:'A.II.2',  scope:'CLIENT',  room:'Phòng Họp',      desc:'Ghế họp (CĐT cấp)',                dvt:'cái', qty:10,      qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R19'      },
  // SECTION B — PHÒNG LÀM VIỆC
  { item_no:'B.I.1',   scope:'HOMEPRO', room:'Phòng LV',       desc:'Thảm trải sàn',                    dvt:'m2',  qty:120.96,  qty_note:'net=112 ×1.08', pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R22/R23'  },
  { item_no:'B.I.2',   scope:'HOMEPRO', room:'Phòng LV',       desc:'Len chân tường',                   dvt:'md',  qty:34.65,   qty_note:'net=33 ×1.05',  pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R24/R25'  },
  { item_no:'B.I.3',   scope:'HOMEPRO', room:'Phòng LV',       desc:'Rèm che nắng',                     dvt:'m2',  qty:45,      qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R26/R27'  },
  { item_no:'B.I.4',   scope:'HOMEPRO', room:'Phòng LV',       desc:'Vách ốp gỗ MDF trắng',             dvt:'m2',  qty:16.2435, qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R28'      },
  { item_no:'B.I.5',   scope:'HOMEPRO', room:'Phòng LV',       desc:'Tủ hồ sơ cao R400×C2800mm',        dvt:'m2',  qty:13.005,  qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R29'      },
  { item_no:'B.II.1',  scope:'CLIENT',  room:'Phòng LV',       desc:'Bàn tròn tiếp khách (CĐT cấp)',    dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R31'      },
  { item_no:'B.II.2',  scope:'HOMEPRO', room:'Phòng LV',       desc:'Ghế tiếp khách đơn',               dvt:'cái', qty:3,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R32'      },
  { item_no:'B.II.3',  scope:'CLIENT',  room:'Phòng LV',       desc:'Sofa băng dài (CĐT cấp)',          dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R33'      },
  { item_no:'B.II.4',  scope:'HOMEPRO', room:'Phòng LV',       desc:'Quầy lễ tân (3.6md)',              dvt:'hệ',  qty:1,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R34'      },
  { item_no:'B.II.5',  scope:'CLIENT',  room:'Phòng LV',       desc:'Ghế lễ tân G1 (CĐT cấp)',         dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R35'      },
  { item_no:'B.II.6',  scope:'HOMEPRO', room:'Phòng LV',       desc:'Hệ quầy giao dịch',                dvt:'hệ',  qty:1,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R36'      },
  { item_no:'B.II.7',  scope:'HOMEPRO', room:'Phòng LV',       desc:'Vách ngăn bàn ván gỗ',             dvt:'cái', qty:2,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'YES', src_row:'R37'      },
  { item_no:'B.II.8',  scope:'HOMEPRO', room:'Phòng LV',       desc:'Vách ngăn bàn mica trong',         dvt:'cái', qty:3,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R38'      },
  { item_no:'B.II.9',  scope:'CLIENT',  room:'Phòng LV',       desc:'Ghế khách GD G2 (CĐT cấp)',       dvt:'cái', qty:3,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R39'      },
  { item_no:'B.II.10', scope:'CLIENT',  room:'Phòng LV',       desc:'Ghế NV quầy GD (CĐT cấp)',        dvt:'cái', qty:3,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R40'      },
  { item_no:'B.II.11', scope:'HOMEPRO', room:'Phòng LV',       desc:'Cửa bật 1 (1.7md)',                dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R41'      },
  { item_no:'B.II.12', scope:'HOMEPRO', room:'Phòng LV',       desc:'Tủ thấp gần cửa bật',             dvt:'hệ',  qty:1,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R42'      },
  { item_no:'B.II.13', scope:'HOMEPRO', room:'Phòng LV',       desc:'Cửa bật 2 (0.9md)',                dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R43'      },
  { item_no:'B.II.14', scope:'HOMEPRO', room:'Phòng LV',       desc:'Hệ bồn trồng cây',                 dvt:'hệ',  qty:1,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R44'      },
  { item_no:'B.II.15', scope:'HOMEPRO', room:'Phòng LV',       desc:'Tủ di động quầy GD',               dvt:'cái', qty:3,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'YES', src_row:'R45'      },
  { item_no:'B.II.16', scope:'HOMEPRO', room:'Phòng LV',       desc:'Bàn LV nhân viên (6 cái)',         dvt:'cái', qty:6,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R46'      },
  { item_no:'B.II.17', scope:'CLIENT',  room:'Phòng LV',       desc:'Ghế nhân viên (CĐT cấp)',         dvt:'cái', qty:6,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R47'      },
  { item_no:'B.II.18', scope:'HOMEPRO', room:'Phòng LV',       desc:'Vách ngăn mica D1000',             dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R48'      },
  { item_no:'B.II.19', scope:'HOMEPRO', room:'Phòng LV',       desc:'Tủ di động 3NK nhân viên',         dvt:'cái', qty:6,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'YES', src_row:'R49'      },
  { item_no:'B.II.20', scope:'HOMEPRO', room:'Phòng LV',       desc:'Bàn LV phó phòng (2 cái)',         dvt:'cái', qty:2,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R50'      },
  { item_no:'B.II.21', scope:'CLIENT',  room:'Phòng LV',       desc:'Ghế phó phòng (CĐT cấp)',         dvt:'cái', qty:2,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R51'      },
  { item_no:'B.II.22', scope:'HOMEPRO', room:'Phòng LV',       desc:'Bàn LV trưởng phòng',              dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R52'      },
  { item_no:'B.II.23', scope:'CLIENT',  room:'Phòng LV',       desc:'Ghế trưởng phòng (CĐT cấp)',      dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R53'      },
  { item_no:'B.II.24', scope:'HOMEPRO', room:'Phòng LV',       desc:'Tủ di động 3NK TP/PP',             dvt:'cái', qty:3,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R54'      },
  { item_no:'B.II.25', scope:'HOMEPRO', room:'Phòng LV',       desc:'Tủ thấp+hộc cây D=1400mm',        dvt:'hệ',  qty:1,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R55'      },
  { item_no:'B.II.26', scope:'HOMEPRO', room:'Phòng LV',       desc:'Tủ thấp D=4975mm',                 dvt:'hệ',  qty:1,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'YES', src_row:'R56'      },
  { item_no:'B.II.27', scope:'HOMEPRO', room:'Phòng LV',       desc:'Tủ thấp vách kính ngoài',         dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'YES', src_row:'R57'      },
  { item_no:'B.II.28', scope:'HOMEPRO', room:'Phòng LV',       desc:'Tủ thấp sau bàn TP/PP',           dvt:'hệ',  qty:1,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R58'      },
  // SECTION C — PHÒNG GĐ CN
  { item_no:'C.I.1',   scope:'HOMEPRO', room:'Phòng GĐ CN',    desc:'Thảm trải sàn',                    dvt:'m2',  qty:27.615,  qty_note:'net=26.3 ×1.05',pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R61/R62'  },
  { item_no:'C.I.2',   scope:'HOMEPRO', room:'Phòng GĐ CN',    desc:'Len chân tường',                   dvt:'md',  qty:11.55,   qty_note:'net=11 ×1.05',  pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R63/R64'  },
  { item_no:'C.I.3',   scope:'HOMEPRO', room:'Phòng GĐ CN',    desc:'Rèm che nắng',                     dvt:'m2',  qty:12.291,  qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R65/R66'  },
  { item_no:'C.I.4',   scope:'HOMEPRO', room:'Phòng GĐ CN',    desc:'Tủ phòng GĐ',                      dvt:'hệ',  qty:2,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'YES', src_row:'R67'      },
  { item_no:'C.I.5',   scope:'HOMEPRO', room:'Phòng GĐ CN',    desc:'Ốp vách giữa 2 tủ',               dvt:'m2',  qty:7.191,   qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R68'      },
  { item_no:'C.II.1',  scope:'HOMEPRO', room:'Phòng GĐ CN',    desc:'Bàn LV GĐ',                        dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'YES', src_row:'R70'      },
  { item_no:'C.II.2',  scope:'CLIENT',  room:'Phòng GĐ CN',    desc:'Ghế GĐ (CĐT cấp)',                dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R71'      },
  { item_no:'C.II.3',  scope:'CLIENT',  room:'Phòng GĐ CN',    desc:'Ghế khách G4 (CĐT cấp)',          dvt:'cái', qty:2,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R72'      },
  { item_no:'C.II.4',  scope:'CLIENT',  room:'Phòng GĐ CN',    desc:'Bàn tròn tiếp khách (CĐT cấp)',   dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R73'      },
  { item_no:'C.II.5',  scope:'HOMEPRO', room:'Phòng GĐ CN',    desc:'Ghế tiếp khách đơn',               dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R74'      },
  { item_no:'C.II.6',  scope:'CLIENT',  room:'Phòng GĐ CN',    desc:'Sofa băng dài (CĐT cấp)',         dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R75'      },
  // SECTION D — PHÒNG PANTRY
  { item_no:'D.I.1',   scope:'NOT_EXE', room:'Pantry',          desc:'Thảm trải sàn (không TH)',         dvt:'m2',  qty:0,       qty_note:'NOT_EXECUTED',  pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R78/R79'  },
  { item_no:'D.I.2',   scope:'HOMEPRO', room:'Pantry',          desc:'Len chân tường',                   dvt:'md',  qty:13.86,   qty_note:'net=13.2 ×1.05',pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R80/R81'  },
  { item_no:'D.I.3',   scope:'HOMEPRO', room:'Pantry',          desc:'Rèm che nắng (pantry+kho)',        dvt:'m2',  qty:15.555,  qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R82/R83'  },
  { item_no:'D.I.4',   scope:'HOMEPRO', room:'Pantry',          desc:'Hệ quầy tủ pantry',                dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'YES', src_row:'R84'      },
  { item_no:'D.I.5',   scope:'NOT_EXE', room:'Pantry',          desc:'Mặt đá PVC (không TH)',            dvt:'m',   qty:0,       qty_note:'NOT_EXECUTED',  pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R85'      },
  { item_no:'D.I.6',   scope:'NOT_EXE', room:'Pantry',          desc:'Hệ đợt trên quầy (không TH)',      dvt:'hệ',  qty:0,       qty_note:'NOT_EXECUTED',  pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R86'      },
  { item_no:'D.I.7',   scope:'NOT_EXE', room:'Pantry',          desc:'Ốp mặt đứng PVC (không TH)',       dvt:'hệ',  qty:0,       qty_note:'NOT_EXECUTED',  pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R87'      },
  { item_no:'D.I.8',   scope:'NOT_EXE', room:'Pantry',          desc:'Tủ bỏ tủ lạnh MDF (không TH)',     dvt:'cái', qty:0,       qty_note:'NOT_EXECUTED',  pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R88'      },
  { item_no:'D.I.9',   scope:'HOMEPRO', room:'Pantry',          desc:'Hệ ghế sofa băng pantry',          dvt:'hệ',  qty:1,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'YES', src_row:'R89'      },
  { item_no:'D.II.1',  scope:'CLIENT',  room:'Pantry',          desc:'Bàn ăn chữ nhật (CĐT cấp)',       dvt:'cái', qty:2,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R91'      },
  { item_no:'D.II.2',  scope:'CLIENT',  room:'Pantry',          desc:'Bàn ăn hình vuông (CĐT cấp)',     dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R92'      },
  { item_no:'D.II.3',  scope:'CLIENT',  room:'Pantry',          desc:'Ghế ăn (CĐT cấp)',                dvt:'cái', qty:6,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R93'      },
  // SECTION E — PHÒNG CHỦ TỊCH
  { item_no:'E.I.1',   scope:'HOMEPRO', room:'Phòng CT',        desc:'Thảm trải sàn',                    dvt:'m2',  qty:98.7,    qty_note:'net=94 ×1.05',  pricing:'NEED_QUOTATION',   clarify:'YES', src_row:'R96/R97'  },
  { item_no:'E.I.2',   scope:'HOMEPRO', room:'Phòng CT',        desc:'Len chân tường',                   dvt:'md',  qty:42,      qty_note:'net=40 ×1.05',  pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R98/R99'  },
  { item_no:'E.I.3',   scope:'HOMEPRO', room:'Phòng CT',        desc:'Rèm che nắng',                     dvt:'m2',  qty:48.96,   qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R100/R101'},
  { item_no:'E.I.4',   scope:'HOMEPRO', room:'Phòng CT',        desc:'Vách ốp gỗ',                       dvt:'m2',  qty:30.6,    qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'YES', src_row:'R102'     },
  { item_no:'E.I.5',   scope:'HOMEPRO', room:'Phòng CT',        desc:'Nẹp T inox ron vách gỗ',           dvt:'md',  qty:47.7,    qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R103'     },
  { item_no:'E.I.6',   scope:'HOMEPRO', room:'Phòng CT',        desc:'Tủ phòng chủ tịch MDF',            dvt:'m2',  qty:26.265,  qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'YES', src_row:'R104'     },
  { item_no:'E.I.7',   scope:'HOMEPRO', room:'Phòng CT',        desc:'Logo BMS mica có đèn',             dvt:'bộ',  qty:0,       qty_note:'NEED_CLARIF',   pricing:'NEED_QUOTATION',   clarify:'YES', src_row:'R105'     },
  { item_no:'E.II.1',  scope:'CLIENT',  room:'Phòng CT',        desc:'Bàn LV chủ tịch (CĐT cấp)',       dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R107'     },
  { item_no:'E.II.2',  scope:'CLIENT',  room:'Phòng CT',        desc:'Ghế chủ tịch (CĐT cấp)',          dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R108'     },
  { item_no:'E.II.3',  scope:'CLIENT',  room:'Phòng CT',        desc:'Ghế khách (CĐT cấp)',             dvt:'cái', qty:2,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R109'     },
  { item_no:'E.II.4',  scope:'CLIENT',  room:'Phòng CT',        desc:'Bàn sofa (CĐT cấp)',              dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R110'     },
  { item_no:'E.II.5',  scope:'CLIENT',  room:'Phòng CT',        desc:'Ghế sofa đơn (CĐT cấp)',          dvt:'cái', qty:2,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R111'     },
  { item_no:'E.II.6',  scope:'CLIENT',  room:'Phòng CT',        desc:'Ghế sofa đôi (CĐT cấp)',          dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R112'     },
  { item_no:'E.II.7',  scope:'CLIENT',  room:'Phòng CT',        desc:'Bàn pha trà (CĐT cấp)',           dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R113'     },
  { item_no:'E.II.8',  scope:'CLIENT',  room:'Phòng CT',        desc:'Bàn họp 3000×1200×750 (CĐT)',     dvt:'cái', qty:1,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R114'     },
  { item_no:'E.II.9',  scope:'CLIENT',  room:'Phòng CT',        desc:'Ghế họp (CĐT cấp)',               dvt:'cái', qty:9,       qty_note:'from source',   pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R115'     },
  // SECTION F — HÀNH LANG
  { item_no:'F.1',     scope:'NOT_EXE', room:'Hành Lang',       desc:'Thảm trải sàn (không TH)',         dvt:'m2',  qty:0,       qty_note:'NOT_EXECUTED',  pricing:'NOT_APPLICABLE',   clarify:'NO',  src_row:'R117/R118'},
  { item_no:'F.2',     scope:'NOT_EXE', room:'Hành Lang',       desc:'Len chân tường (không TH)',        dvt:'md',  qty:null,    qty_note:'NULL-not in src',pricing:'NOT_APPLICABLE',  clarify:'NO',  src_row:'R119/R120'},
  // SECTION G — CHI PHÍ KHÁC
  { item_no:'G.1',     scope:'HOMEPRO', room:'Chi Phí Khác',    desc:'Chi phí vận chuyển tầng 15',       dvt:'lần', qty:1,       qty_note:'from source',   pricing:'NEED_QUOTATION',   clarify:'NO',  src_row:'R122'     },
];

// ════════════════════════════════════════════
// ITEM → DRAWING CROSSWALK MAP
// Based on typical NT internal design:
// - Thảm, len, rèm → không có drawing riêng (specification item)
// - Tủ, bàn, vách → có drawing trong PDF
// ════════════════════════════════════════════
const ITEM_TO_DRAWING = {
  // CABINETS (Tủ) → T-xx series
  'B.I.5':   { drawing_codes: ['T-03'],         pages: 'NT-15',     confidence: 'INFERRED', note: 'Tủ hồ sơ cao PLV → likely T-03' },
  'C.I.4':   { drawing_codes: ['T-01','T-02'],  pages: 'NT-02,NT-03,NT-10', confidence: 'INFERRED', note: 'Tủ phòng GĐ → T-01 or T-02 family' },
  'E.I.6':   { drawing_codes: ['T-10'],         pages: 'NT-05',     confidence: 'INFERRED', note: 'Tủ phòng CT → T-10' },
  'B.II.12': { drawing_codes: ['T-04','T-05'],  pages: 'NT-16,NT-17', confidence: 'INFERRED', note: 'Tủ thấp gần cửa bật → T-04 or T-05 family' },
  'B.II.25': { drawing_codes: ['T-06'],         pages: 'NT-18',     confidence: 'INFERRED', note: 'Tủ hồ sơ thấp 1400 → T-06' },
  'B.II.26': { drawing_codes: ['T-07','T-08'],  pages: 'NT-19,NT-20', confidence: 'INFERRED', note: 'Tủ thấp 4975mm → T-07 or T-08' },
  'B.II.27': { drawing_codes: ['T-09'],         pages: 'NT-21',     confidence: 'INFERRED', note: 'Tủ thấp vách kính ngoài → T-09' },
  'D.I.4':   { drawing_codes: ['T-02'],         pages: 'NT-10',     confidence: 'INFERRED', note: 'Hệ quầy tủ pantry → possibly T-02' },
  // PARTITIONS (Vách) → V-xx series
  'A.I.4':   { drawing_codes: ['V-01'],         pages: 'NT-04',     confidence: 'INFERRED', note: 'Vách ốp gỗ P.Họp → V-01' },
  'E.I.4':   { drawing_codes: ['V-01','V-02'],  pages: 'NT-04,NT-07', confidence: 'INFERRED', note: 'Vách ốp gỗ P.CT → V-01 or V-02' },
  'B.I.4':   { drawing_codes: ['V-04','V-05'],  pages: 'NT-13,NT-06,NT-08,NT-33', confidence: 'INFERRED', note: 'Vách ốp MDF trắng PLV → V-04 or V-05' },
  'B.II.7':  { drawing_codes: ['V-04'],         pages: 'NT-13',     confidence: 'INFERRED', note: 'Vách ngăn ván gỗ → V-04' },
  'B.II.8':  { drawing_codes: ['V-05'],         pages: 'NT-06',     confidence: 'INFERRED', note: 'Vách ngăn mica → V-05' },
  'B.II.18': { drawing_codes: ['V-05'],         pages: 'NT-06,NT-08', confidence: 'INFERRED', note: 'Vách mica D1000 → V-05' },
  'C.I.5':   { drawing_codes: ['V-02'],         pages: 'NT-07',     confidence: 'INFERRED', note: 'Ốp vách giữa 2 tủ → V-02' },
  // DESKS (Bàn làm việc) → BL-xx series
  'A.II.1':  { drawing_codes: ['BL-06'],        pages: 'NT-12',     confidence: 'INFERRED', note: 'Bàn họp D3200 phòng A → BL-06' },
  'B.II.16': { drawing_codes: ['BL-01'],        pages: 'NT-11',     confidence: 'INFERRED', note: 'Bàn LV NV 1200×600 → BL-01' },
  'B.II.20': { drawing_codes: ['BL-02'],        pages: 'NT-25',     confidence: 'INFERRED', note: 'Bàn LV PP 1400×600 → BL-02' },
  'B.II.22': { drawing_codes: ['BL-03'],        pages: 'NT-27',     confidence: 'INFERRED', note: 'Bàn LV TP 1600×700 → BL-03' },
  'C.II.1':  { drawing_codes: ['BL-04'],        pages: 'NT-26',     confidence: 'INFERRED', note: 'Bàn LV GĐ → BL-04' },
  'B.II.28': { drawing_codes: ['BL-05'],        pages: 'NT-30',     confidence: 'INFERRED', note: 'Tủ thấp sau bàn TP/PP → BL-05 (combo)' },
  // COUNTER → GD-01
  'B.II.4':  { drawing_codes: ['GD-01'],        pages: 'NT-28',     confidence: 'INFERRED', note: 'Quầy lễ tân 3.6md → GD-01' },
  'B.II.6':  { drawing_codes: ['GD-01'],        pages: 'NT-28',     confidence: 'INFERRED', note: 'Hệ quầy giao dịch → GD-01' },
  // CHAIRS → G-xx series
  'A.II.2':  { drawing_codes: ['G-01'],         pages: 'NT-14',     confidence: 'INFERRED', note: 'Ghế họp (CĐT) → G-01 for reference' },
  'B.II.2':  { drawing_codes: ['G-01'],         pages: 'NT-14',     confidence: 'INFERRED', note: 'Ghế tiếp khách đơn → G-01' },
  'C.II.5':  { drawing_codes: ['G-02'],         pages: 'NT-34',     confidence: 'INFERRED', note: 'Ghế tiếp khách phòng GĐ → G-02' },
  'D.I.9':   { drawing_codes: ['G-03'],         pages: 'NT-35',     confidence: 'INFERRED', note: 'Hệ ghế sofa băng pantry → G-03' },
  // FURNITURE / OTHER
  'B.II.14': { drawing_codes: ['D-03'],         pages: 'NT-09',     confidence: 'INFERRED', note: 'Hệ bồn trồng cây → D-03' },
  'B.II.11': { drawing_codes: ['D-01'],         pages: 'NT-22',     confidence: 'INFERRED', note: 'Cửa bật → D-01' },
  'B.II.13': { drawing_codes: ['D-01'],         pages: 'NT-22',     confidence: 'INFERRED', note: 'Cửa bật 2 → D-01' },
  'B.II.24': { drawing_codes: ['D-02'],         pages: 'NT-24',     confidence: 'INFERRED', note: 'Tủ di động 3NK → D-02' },
  'B.II.15': { drawing_codes: ['D-02'],         pages: 'NT-24',     confidence: 'INFERRED', note: 'Tủ di động quầy GD → D-02' },
  'B.II.19': { drawing_codes: ['D-02'],         pages: 'NT-24',     confidence: 'INFERRED', note: 'Tủ di động 3NK NV → D-02' },
  // CURTAIN RAIL → R-01
  'A.I.3':   { drawing_codes: ['R-01'],         pages: 'NT-23',     confidence: 'INFERRED', note: 'Rèm P.Họp → R-01 (rãnh/thanh rèm)' },
  'B.I.3':   { drawing_codes: ['R-01'],         pages: 'NT-23',     confidence: 'INFERRED', note: 'Rèm P.LV → R-01' },
  'C.I.3':   { drawing_codes: ['R-01'],         pages: 'NT-23',     confidence: 'INFERRED', note: 'Rèm P.GĐ → R-01' },
  'D.I.3':   { drawing_codes: ['R-01'],         pages: 'NT-23',     confidence: 'INFERRED', note: 'Rèm Pantry+Kho → R-01' },
  'E.I.3':   { drawing_codes: ['R-01'],         pages: 'NT-23',     confidence: 'INFERRED', note: 'Rèm P.CT → R-01' },
  // INOX → MI-01, MI-02
  'A.I.5':   { drawing_codes: ['MI-01','MI-02'], pages: 'NT-31,NT-32', confidence: 'INFERRED', note: 'Nẹp T inox P.Họp → MI-01 or MI-02' },
  'E.I.5':   { drawing_codes: ['MI-01','MI-02'], pages: 'NT-31,NT-32', confidence: 'INFERRED', note: 'Nẹp T inox P.CT → MI-01 or MI-02' },
};

// Items that are SPECIFICATION ONLY (no dedicated drawing expected)
const SPEC_ONLY = new Set(['A.I.1','A.I.2','B.I.1','B.I.2','C.I.1','C.I.2','D.I.1','D.I.2','E.I.1','E.I.2',
  'G.1','D.I.5','D.I.6','D.I.7','D.I.8','F.1','F.2','E.I.7']);

// ════════════════════════════════════════════
// BUILD CROSSWALK
// ════════════════════════════════════════════
const crosswalk = KL_ITEMS.map(item => {
  const drawing = ITEM_TO_DRAWING[item.item_no];
  const isSpecOnly = SPEC_ONLY.has(item.item_no);

  let status, drawingCode, pages, confidence, note;

  if (item.scope === 'NOT_EXE') {
    status = 'NOT_EXECUTED'; drawingCode = '—'; pages = '—'; confidence = 'N/A';
    note = 'Scope=NOT_EXECUTED — not in technical drawings';
  } else if (item.scope === 'CLIENT') {
    status = 'CLIENT_SUPPLIED'; drawingCode = '—'; pages = '—'; confidence = 'N/A';
    note = 'CĐT cấp — not in HomePro scope. No technical drawing required.';
  } else if (isSpecOnly) {
    status = 'SPEC_ONLY';
    drawingCode = 'SPEC';
    pages = 'N/A';
    confidence = 'N/A';
    note = 'Specification/finishes item — no dedicated drawing sheet';
  } else if (drawing) {
    const hasConflict = item.clarify === 'YES';
    status = hasConflict ? 'NEEDS_REVIEW' : 'MATCHED_INFERRED';
    drawingCode = drawing.drawing_codes.join(', ');
    pages = drawing.pages;
    confidence = drawing.confidence;
    note = drawing.note + (hasConflict ? ' | ALSO: clarification_required=YES' : '');
  } else {
    status = 'MISSING_DRAWING';
    drawingCode = '?';
    pages = '?';
    confidence = 'NONE';
    note = 'No drawing code mapping found — REVIEW REQUIRED';
  }

  return {
    source_item: item.item_no,
    room: item.room,
    description: item.desc,
    dvt: item.dvt,
    qty_boq: item.qty,
    qty_note: item.qty_note,
    scope: item.scope,
    pricing_status: item.pricing,
    clarify_required: item.clarify,
    drawing_code: drawingCode,
    drawing_pages: pages,
    confidence: confidence,
    crosswalk_status: status,
    note: note,
    source_row_excel: item.src_row,
    source_file_boq: 'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx',
    source_file_pdf: '060826_TKNT_VP BAO MINH.pdf',
  };
});

// ════════════════════════════════════════════
// REVIEW QUEUE
// ════════════════════════════════════════════
const reviewQueue = crosswalk.filter(c =>
  c.crosswalk_status === 'NEEDS_REVIEW' ||
  c.crosswalk_status === 'MISSING_DRAWING' ||
  c.clarify_required === 'YES'
);

// ════════════════════════════════════════════
// STAT SUMMARY
// ════════════════════════════════════════════
const byStatus = {};
crosswalk.forEach(c => { byStatus[c.crosswalk_status] = (byStatus[c.crosswalk_status]||0)+1; });

// ════════════════════════════════════════════
// WRITE OUTPUTS
// ════════════════════════════════════════════
const wb = XLSX.utils.book_new();

// Sheet 1: Full crosswalk
const cwH = ['source_item','room','description','dvt','qty_boq','qty_note','scope','pricing_status',
  'clarify_required','drawing_code','drawing_pages','confidence','crosswalk_status','note',
  'source_row_excel','source_file_boq','source_file_pdf'];
const cwD = crosswalk.map(c => cwH.map(h => c[h]));
const wsCW = XLSX.utils.aoa_to_sheet([cwH, ...cwD]);
wsCW['!cols'] = [{ wch:10 },{ wch:14 },{ wch:45 },{ wch:6 },{ wch:8 },{ wch:18 },{ wch:10 },{ wch:16 },
  { wch:8 },{ wch:20 },{ wch:25 },{ wch:12 },{ wch:20 },{ wch:65 },{ wch:12 },{ wch:45 },{ wch:45 }];
XLSX.utils.book_append_sheet(wb, wsCW, 'ITEM_CROSSWALK');

// Sheet 2: Review queue
if (reviewQueue.length > 0) {
  const rqD = reviewQueue.map(c => cwH.map(h => c[h]));
  const wsRQ = XLSX.utils.aoa_to_sheet([cwH, ...rqD]);
  XLSX.utils.book_append_sheet(wb, wsRQ, 'REVIEW_QUEUE');
}

// Sheet 3: Status summary
const ssH = ['crosswalk_status','count'];
const ssD = Object.entries(byStatus).map(([s,c]) => [s,c]);
const wsSS = XLSX.utils.aoa_to_sheet([ssH, ...ssD]);
XLSX.utils.book_append_sheet(wb, wsSS, 'STATUS_SUMMARY');

// Sheet 4: HomePro item codes
const hpItems = crosswalk
  .filter(c => c.scope === 'HOMEPRO' && c.drawing_code !== '—' && c.drawing_code !== '?' && c.drawing_code !== 'SPEC')
  .map(c => ({
    item_code: c.source_item,
    drawing_code: c.drawing_code,
    pages: c.drawing_pages,
    description: c.description,
    room: c.room,
    qty: c.qty_boq,
    dvt: c.dvt,
    status: c.crosswalk_status,
  }));
const hpH = ['item_code','drawing_code','pages','description','room','qty','dvt','status'];
const hpD = hpItems.map(h => hpH.map(k => h[k]));
const wsHP = XLSX.utils.aoa_to_sheet([hpH, ...hpD]);
XLSX.utils.book_append_sheet(wb, wsHP, 'HOMEPRO_ITEMS_TECHNICAL');

XLSX.writeFile(wb, path.join(OUT_DIR, '04-ITEM-CROSSWALK.xlsx'));
console.log('Written: 04-ITEM-CROSSWALK.xlsx');

// Also write as JSON
fs.writeFileSync(path.join(OUT_DIR, '04-item-crosswalk.json'), JSON.stringify({ crosswalk, reviewQueue, summary: byStatus }, null, 2), 'utf8');
console.log('Written: 04-item-crosswalk.json');

// Print summary
console.log('\n════════════════════════════════════════════════');
console.log('  PHASE 1D — ITEM CROSSWALK COMPLETE');
console.log('════════════════════════════════════════════════');
console.log('  Total KL items    :', KL_ITEMS.length);
Object.entries(byStatus).forEach(([s,c]) => console.log(`  ${s.padEnd(22)}: ${c}`));
console.log('  REVIEW QUEUE      :', reviewQueue.length, 'items');
console.log('  ORPHAN BOQ        :', crosswalk.filter(c=>c.crosswalk_status==='MISSING_DRAWING').length);
console.log('════════════════════════════════════════════════');
