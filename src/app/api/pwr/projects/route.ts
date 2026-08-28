import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrProjects, pwrTasks } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type TaskDef = { title: string; category: string; priority: string; phase: number; description: string };

// â”€â”€â”€ TEMPLATE LIGHT â€” 15 task (dá»± Ã¡n nhá» < 50tr) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TEMPLATE_LIGHT: TaskDef[] = [
  // Phase 1 â€” Tiáº¿p nháº­n (3)
  { phase:1, category:'ORDER',      priority:'HIGH',   title:'Tiáº¿p nháº­n yÃªu cáº§u vÃ  thÃ´ng tin khÃ¡ch hÃ ng',       description:'Thu tháº­p thÃ´ng tin: diá»‡n tÃ­ch, phong cÃ¡ch, ngÃ¢n sÃ¡ch, deadline.' },
  { phase:1, category:'PROJECT',    priority:'HIGH',   title:'Kháº£o sÃ¡t vÃ  Ä‘o Ä‘áº¡c thá»±c Ä‘á»‹a',                     description:'Äo Ä‘áº¡c hiá»‡n tráº¡ng, chá»¥p áº£nh, ghi chÃº káº¿t cáº¥u.' },
  { phase:1, category:'ADMIN',      priority:'HIGH',   title:'KÃ½ há»£p Ä‘á»“ng vÃ  thu cá»c',                          description:'KÃ½ há»£p Ä‘á»“ng, thu Ä‘áº·t cá»c, phÃ¡t hÃ nh báº£n váº½ chÃ­nh thá»©c.' },
  // Phase 2 â€” Váº­t tÆ° & Sáº£n xuáº¥t (5)
  { phase:2, category:'MATERIAL',   priority:'HIGH',   title:'Láº­p BOM vÃ  Ä‘áº·t váº­t tÆ°',                           description:'Tá»•ng há»£p váº­t tÆ°, Ä‘áº·t hÃ ng, xÃ¡c nháº­n thá»i gian giao.' },
  { phase:2, category:'MATERIAL',   priority:'HIGH',   title:'Nháº­n váº­t tÆ° vÃ  kiá»ƒm tra',                         description:'Kiá»ƒm tra sá»‘ lÆ°á»£ng, quy cÃ¡ch khi nháº­n hÃ ng.' },
  { phase:2, category:'PRODUCTION', priority:'HIGH',   title:'Ra file CNC vÃ  cáº¯t táº¥m',                          description:'Xuáº¥t file, tá»‘i Æ°u nesting, cháº¡y CNC cáº¯t cÃ¡c chi tiáº¿t.' },
  { phase:2, category:'PRODUCTION', priority:'HIGH',   title:'Gia cÃ´ng, láº¯p rÃ¡p vÃ  hoÃ n thiá»‡n',                 description:'DÃ¡n cáº¡nh, láº¯p rÃ¡p, sÆ¡n phá»§, láº¯p phá»¥ kiá»‡n.' },
  { phase:2, category:'PRODUCTION', priority:'HIGH',   title:'QC vÃ  Ä‘Ã³ng gÃ³i xuáº¥t kho',                         description:'Kiá»ƒm tra cháº¥t lÆ°á»£ng, Ä‘Ã³ng gÃ³i, ghi nhÃ£n, láº­p phiáº¿u xuáº¥t kho.' },
  // Phase 3 â€” Láº¯p Ä‘áº·t & BÃ n giao (5)
  { phase:3, category:'PRODUCTION', priority:'HIGH',   title:'Váº­n chuyá»ƒn vÃ  láº¯p Ä‘áº·t táº¡i cÃ´ng trÃ¬nh',            description:'Váº­n chuyá»ƒn, bá»‘c dá»¡, láº¯p Ä‘áº·t theo báº£n váº½, cÃ¢n chá»‰nh thá»§y bÃ¬nh.' },
  { phase:3, category:'PRODUCTION', priority:'HIGH',   title:'Vá»‡ sinh vÃ  hoÃ n thiá»‡n sau láº¯p Ä‘áº·t',               description:'Lau sáº¡ch, thÃ¡o bÄƒng báº£o vá»‡, kiá»ƒm tra láº§n cuá»‘i.' },
  { phase:3, category:'ADMIN',      priority:'HIGH',   title:'Nghiá»‡m thu vÃ  kÃ½ biÃªn báº£n bÃ n giao',              description:'KhÃ¡ch kiá»ƒm tra, kÃ½ biÃªn báº£n, ghi nháº­n Ä‘iá»ƒm cáº§n xá»­ lÃ½.' },
  { phase:3, category:'ADMIN',      priority:'HIGH',   title:'Thu tiá»n quyáº¿t toÃ¡n',                             description:'Xuáº¥t hÃ³a Ä‘Æ¡n, thu pháº§n cÃ²n láº¡i theo há»£p Ä‘á»“ng.' },
  { phase:3, category:'ADMIN',      priority:'MEDIUM', title:'Xá»­ lÃ½ Ä‘iá»ƒm chá»‰nh sá»­a sau nghiá»‡m thu',            description:'Kháº¯c phá»¥c cÃ¡c Ä‘iá»ƒm khÃ¡ch yÃªu cáº§u trong thá»i gian cam káº¿t.' },
  { phase:3, category:'PROJECT',    priority:'MEDIUM', title:'Tá»•ng káº¿t dá»± Ã¡n: chi phÃ­ vÃ  bÃ i há»c',              description:'So sÃ¡nh doanh thu vs chi phÃ­ thá»±c táº¿. Ghi bÃ i há»c kinh nghiá»‡m.' },
  { phase:3, category:'ORDER',      priority:'LOW',    title:'ChÄƒm sÃ³c khÃ¡ch hÃ ng sau bÃ n giao',                description:'LiÃªn há»‡ sau 1 tuáº§n, 1 thÃ¡ng. Xá»­ lÃ½ báº£o hÃ nh náº¿u cÃ³.' },
];

// â”€â”€â”€ TEMPLATE STANDARD â€” 28 task (dá»± Ã¡n vá»«a 50-200tr) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TEMPLATE_STANDARD: TaskDef[] = [
  // Phase 1 â€” Tiáº¿p nháº­n & Kháº£o sÃ¡t (4)
  { phase:1, category:'ORDER',      priority:'HIGH',   title:'Tiáº¿p nháº­n yÃªu cáº§u vÃ  thÃ´ng tin khÃ¡ch hÃ ng',       description:'Thu tháº­p thÃ´ng tin dá»± Ã¡n: diá»‡n tÃ­ch, phong cÃ¡ch, ngÃ¢n sÃ¡ch, timeline.' },
  { phase:1, category:'PROJECT',    priority:'HIGH',   title:'Kháº£o sÃ¡t thá»±c Ä‘á»‹a cÃ´ng trÃ¬nh',                    description:'Äo Ä‘áº¡c hiá»‡n tráº¡ng, chá»¥p áº£nh, ghi chÃº Ä‘áº·c Ä‘iá»ƒm káº¿t cáº¥u.' },
  { phase:1, category:'ORDER',      priority:'MEDIUM', title:'Láº­p BOQ sÆ¡ bá»™ vÃ  bÃ¡o giÃ¡',                        description:'Liá»‡t kÃª háº¡ng má»¥c, Æ°á»›c tÃ­nh chi phÃ­, gá»­i bÃ¡o giÃ¡ sÆ¡ bá»™.' },
  { phase:1, category:'ADMIN',      priority:'MEDIUM', title:'XÃ¡c nháº­n yÃªu cáº§u vÃ  kÃ½ biÃªn báº£n kháº£o sÃ¡t',       description:'KhÃ¡ch hÃ ng kÃ½ xÃ¡c nháº­n biÃªn báº£n kháº£o sÃ¡t.' },
  // Phase 2 â€” Thiáº¿t káº¿ & Há»£p Ä‘á»“ng (5)
  { phase:2, category:'PROJECT',    priority:'HIGH',   title:'Váº½ báº£n váº½ thiáº¿t káº¿ 2D/3D',                       description:'Thiáº¿t káº¿ layout, máº·t Ä‘á»©ng, phá»‘i cáº£nh 3D.' },
  { phase:2, category:'ORDER',      priority:'HIGH',   title:'Láº­p bÃ¡o giÃ¡ chi tiáº¿t (BOQ chÃ­nh thá»©c)',           description:'TÃ­nh toÃ¡n Ä‘Æ¡n giÃ¡, nhÃ¢n cÃ´ng, váº­t tÆ°, lá»£i nhuáº­n.' },
  { phase:2, category:'ORDER',      priority:'HIGH',   title:'Thuyáº¿t trÃ¬nh vÃ  chá»‰nh sá»­a theo pháº£n há»“i',        description:'TrÃ¬nh bÃ y phÆ°Æ¡ng Ã¡n, chá»‰nh sá»­a theo yÃªu cáº§u khÃ¡ch.' },
  { phase:2, category:'ADMIN',      priority:'HIGH',   title:'KÃ½ há»£p Ä‘á»“ng thi cÃ´ng vÃ  thu cá»c',                description:'KÃ½ há»£p Ä‘á»“ng, thu Ä‘áº·t cá»c, chá»‘t má»‘c thanh toÃ¡n.' },
  { phase:2, category:'PROJECT',    priority:'MEDIUM', title:'PhÃ¡t hÃ nh báº£n váº½ thi cÃ´ng chÃ­nh thá»©c',           description:'ÄÃ³ng dáº¥u ÄÃ£ duyá»‡t, gá»­i bá»™ pháº­n sáº£n xuáº¥t.' },
  // Phase 3 â€” Chuáº©n bá»‹ sáº£n xuáº¥t (6)
  { phase:3, category:'MATERIAL',   priority:'HIGH',   title:'Láº­p danh sÃ¡ch váº­t tÆ° cáº§n mua (BOM)',              description:'Tá»•ng há»£p toÃ n bá»™ váº­t tÆ° theo báº£n váº½ thi cÃ´ng.' },
  { phase:3, category:'MATERIAL',   priority:'HIGH',   title:'Äáº·t mua váº­t tÆ° cÃ²n thiáº¿u',                       description:'LiÃªn há»‡ nhÃ  cung cáº¥p, Ä‘áº·t hÃ ng, xÃ¡c nháº­n thá»i gian giao.' },
  { phase:3, category:'MATERIAL',   priority:'HIGH',   title:'Nháº­n váº­t tÆ° vÃ  xÃ¡c nháº­n Ä‘á»§ 100% trÆ°á»›c sáº£n xuáº¥t', description:'Kiá»ƒm tra sá»‘ lÆ°á»£ng, cháº¥t lÆ°á»£ng. Chá»‰ báº¯t Ä‘áº§u SX khi Ä‘á»§ váº­t tÆ°.' },
  { phase:3, category:'PRODUCTION', priority:'HIGH',   title:'Ra file CNC vÃ  lÃªn káº¿ hoáº¡ch sáº£n xuáº¥t',           description:'Xuáº¥t file CNC, lÃªn lá»‹ch ca mÃ¡y, phÃ¢n cÃ´ng nhÃ¢n sá»±.' },
  { phase:3, category:'PRODUCTION', priority:'MEDIUM', title:'Chuáº©n bá»‹ mÃ¡y mÃ³c vÃ  cáº¯t thá»­ máº«u',               description:'Báº£o dÆ°á»¡ng mÃ¡y, cáº¯t thá»­ máº«u kiá»ƒm tra sai sá»‘ trÆ°á»›c khi cháº¡y loáº¡t.' },
  { phase:3, category:'PERSONNEL',  priority:'MEDIUM', title:'PhÃ¢n cÃ´ng nhÃ¢n sá»± vÃ  giao ca sáº£n xuáº¥t',          description:'Láº­p lá»‹ch ca, phÃ¢n cÃ´ng thá»£ theo háº¡ng má»¥c.' },
  // Phase 4 â€” Sáº£n xuáº¥t (6)
  { phase:4, category:'PRODUCTION', priority:'HIGH',   title:'Cáº¯t táº¥m CNC vÃ  vÃ¡n cÃ´ng nghiá»‡p',                 description:'Cháº¡y CNC cáº¯t cÃ¡c chi tiáº¿t, kiá»ƒm tra sai sá»‘ tá»«ng lÃ´.' },
  { phase:4, category:'PRODUCTION', priority:'HIGH',   title:'DÃ¡n cáº¡nh vÃ  gia cÃ´ng hoÃ n thiá»‡n',                description:'DÃ¡n cáº¡nh PVC/ABS, phay rÃ£nh, khoan lá»— báº£n lá».' },
  { phase:4, category:'PRODUCTION', priority:'HIGH',   title:'Láº¯p rÃ¡p thá»­ táº¡i xÆ°á»Ÿng',                          description:'Láº¯p thá»­ Ä‘á»ƒ kiá»ƒm tra khá»›p ná»‘i, khe há»Ÿ, tháº©m má»¹ trÆ°á»›c khi sÆ¡n.' },
  { phase:4, category:'PRODUCTION', priority:'HIGH',   title:'SÆ¡n phá»§ vÃ  láº¯p phá»¥ kiá»‡n',                        description:'SÆ¡n mÃ u theo chá»n, láº¯p ray, báº£n lá», tay náº¯m.' },
  { phase:4, category:'PRODUCTION', priority:'HIGH',   title:'QC táº¡i xÆ°á»Ÿng vÃ  Ä‘Ã³ng gÃ³i',                       description:'Kiá»ƒm tra cháº¥t lÆ°á»£ng, Ä‘Ã³ng gÃ³i, ghi nhÃ£n tá»«ng há»™p.' },
  { phase:4, category:'PRODUCTION', priority:'HIGH',   title:'Xuáº¥t kho vÃ  bÃ n giao váº­n chuyá»ƒn',                description:'Láº­p phiáº¿u xuáº¥t kho, bÃ n giao cho Ä‘á»™i váº­n chuyá»ƒn.' },
  // Phase 5 â€” Láº¯p Ä‘áº·t & BÃ n giao (5)
  { phase:5, category:'PRODUCTION', priority:'HIGH',   title:'XÃ¡c nháº­n cÃ´ng trÃ¬nh Ä‘á»§ Ä‘iá»u kiá»‡n láº¯p Ä‘áº·t',       description:'Kiá»ƒm tra: Ä‘iá»‡n hoÃ n thiá»‡n, sÃ n Ä‘á»§ cá»©ng, tÆ°á»ng sÆ¡n xong.' },
  { phase:5, category:'PRODUCTION', priority:'HIGH',   title:'Váº­n chuyá»ƒn, bá»‘c dá»¡ vÃ  láº¯p Ä‘áº·t',                  description:'Váº­n chuyá»ƒn, bá»‘c dá»¡ cáº©n tháº­n, láº¯p theo báº£n váº½, cÃ¢n chá»‰nh.' },
  { phase:5, category:'PRODUCTION', priority:'HIGH',   title:'Vá»‡ sinh vÃ  hoÃ n thiá»‡n sau láº¯p Ä‘áº·t',               description:'Lau sáº¡ch, thÃ¡o bÄƒng báº£o vá»‡, kiá»ƒm tra láº§n cuá»‘i.' },
  { phase:5, category:'ADMIN',      priority:'HIGH',   title:'Nghiá»‡m thu vÃ  kÃ½ biÃªn báº£n bÃ n giao vá»›i khÃ¡ch',   description:'KhÃ¡ch kiá»ƒm tra, kÃ½ biÃªn báº£n, ghi nháº­n Ä‘iá»ƒm xá»­ lÃ½.' },
  { phase:5, category:'ADMIN',      priority:'MEDIUM', title:'Xá»­ lÃ½ Ä‘iá»ƒm chá»‰nh sá»­a sau nghiá»‡m thu',            description:'Kháº¯c phá»¥c yÃªu cáº§u chá»‰nh sá»­a trong thá»i gian cam káº¿t.' },
  // Phase 6 â€” Káº¿t sá»• (2)
  { phase:6, category:'ADMIN',      priority:'HIGH',   title:'Xuáº¥t hÃ³a Ä‘Æ¡n vÃ  thu tiá»n quyáº¿t toÃ¡n',            description:'Xuáº¥t hÃ³a Ä‘Æ¡n GTGT, thu pháº§n cÃ²n láº¡i theo há»£p Ä‘á»“ng.' },
  { phase:6, category:'PROJECT',    priority:'MEDIUM', title:'Tá»•ng káº¿t dá»± Ã¡n: chi phÃ­, lá»£i nhuáº­n, bÃ i há»c',   description:'So sÃ¡nh doanh thu vs chi phÃ­ thá»±c táº¿, Ä‘á»‘i chiáº¿u BOM, ghi bÃ i há»c.' },
];

// â”€â”€â”€ TEMPLATE FULL â€” 41 task (dá»± Ã¡n lá»›n > 200tr) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TEMPLATE_FULL: TaskDef[] = [
  { phase:1, category:'ORDER',      priority:'HIGH',   title:'Tiáº¿p nháº­n yÃªu cáº§u vÃ  thÃ´ng tin khÃ¡ch hÃ ng',         description:'Thu tháº­p thÃ´ng tin dá»± Ã¡n: diá»‡n tÃ­ch, phong cÃ¡ch, ngÃ¢n sÃ¡ch, timeline khÃ¡ch hÃ ng mong muá»‘n.' },
  { phase:1, category:'PROJECT',    priority:'HIGH',   title:'Kháº£o sÃ¡t thá»±c Ä‘á»‹a cÃ´ng trÃ¬nh',                       description:'Äo Ä‘áº¡c hiá»‡n tráº¡ng, chá»¥p áº£nh, ghi chÃº Ä‘áº·c Ä‘iá»ƒm káº¿t cáº¥u cáº§n lÆ°u Ã½.' },
  { phase:1, category:'ORDER',      priority:'MEDIUM', title:'Láº­p danh sÃ¡ch háº¡ng má»¥c sÆ¡ bá»™ (BOQ draft)',           description:'Liá»‡t kÃª sÆ¡ bá»™ cÃ¡c háº¡ng má»¥c ná»™i tháº¥t cáº§n sáº£n xuáº¥t vÃ  láº¯p Ä‘áº·t.' },
  { phase:1, category:'ADMIN',      priority:'MEDIUM', title:'XÃ¡c nháº­n yÃªu cáº§u vÃ  kÃ½ biÃªn báº£n kháº£o sÃ¡t',           description:'KhÃ¡ch hÃ ng kÃ½ xÃ¡c nháº­n biÃªn báº£n kháº£o sÃ¡t trÆ°á»›c khi triá»ƒn khai thiáº¿t káº¿.' },
  { phase:1, category:'PROJECT',    priority:'MEDIUM', title:'Má»Ÿ há»“ sÆ¡ dá»± Ã¡n vÃ  lÆ°u trá»¯ tÃ i liá»‡u ban Ä‘áº§u',        description:'Táº¡o folder dá»± Ã¡n, lÆ°u biÃªn báº£n, áº£nh kháº£o sÃ¡t, thÃ´ng tin khÃ¡ch hÃ ng.' },
  { phase:2, category:'PROJECT',    priority:'HIGH',   title:'Váº½ báº£n váº½ thiáº¿t káº¿ 2D/3D',                          description:'Thiáº¿t káº¿ layout máº·t báº±ng, máº·t Ä‘á»©ng, phá»‘i cáº£nh 3D theo yÃªu cáº§u khÃ¡ch.' },
  { phase:2, category:'PROJECT',    priority:'HIGH',   title:'Chá»n váº­t liá»‡u vÃ  hoÃ n thiá»‡n báº£n váº½ ká»¹ thuáº­t',       description:'XÃ¡c Ä‘á»‹nh loáº¡i gá»—, váº­t liá»‡u á»‘p, phá»¥ kiá»‡n, mÃ u sÆ¡n, hoÃ n thiá»‡n báº£n váº½ thi cÃ´ng.' },
  { phase:2, category:'ORDER',      priority:'HIGH',   title:'Láº­p bÃ¡o giÃ¡ chi tiáº¿t (BOQ chÃ­nh thá»©c)',              description:'TÃ­nh toÃ¡n Ä‘Æ¡n giÃ¡, nhÃ¢n cÃ´ng, váº­t tÆ°, lá»£i nhuáº­n. Xuáº¥t file bÃ¡o giÃ¡ PDF.' },
  { phase:2, category:'ORDER',      priority:'HIGH',   title:'Thuyáº¿t trÃ¬nh vÃ  chá»‰nh sá»­a thiáº¿t káº¿ theo pháº£n há»“i',  description:'Gáº·p khÃ¡ch trÃ¬nh bÃ y phÆ°Æ¡ng Ã¡n, ghi nháº­n yÃªu cáº§u chá»‰nh sá»­a, cáº­p nháº­t báº£n váº½.' },
  { phase:2, category:'ADMIN',      priority:'HIGH',   title:'KÃ½ há»£p Ä‘á»“ng thi cÃ´ng vÃ  thu cá»c',                   description:'Soáº¡n há»£p Ä‘á»“ng, kÃ½ káº¿t, thu tiá»n Ä‘áº·t cá»c theo tá»· lá»‡ thá»a thuáº­n.' },
  { phase:2, category:'PROJECT',    priority:'MEDIUM', title:'PhÃ¡t hÃ nh báº£n váº½ thi cÃ´ng chÃ­nh thá»©c',              description:'ÄÃ³ng dáº¥u "ÄÃ£ duyá»‡t" báº£n váº½, gá»­i cho bá»™ pháº­n sáº£n xuáº¥t vÃ  láº¯p Ä‘áº·t.' },
  { phase:3, category:'MATERIAL',   priority:'HIGH',   title:'Láº­p danh sÃ¡ch váº­t tÆ° cáº§n mua (BOM)',                description:'Tá»•ng há»£p toÃ n bá»™ váº­t tÆ°: táº¥m gá»—, phá»¥ kiá»‡n, vÃ­t, keo, sÆ¡n theo báº£n váº½.' },
  { phase:3, category:'MATERIAL',   priority:'HIGH',   title:'Äáº·t mua váº­t tÆ° cÃ²n thiáº¿u',                          description:'LiÃªn há»‡ nhÃ  cung cáº¥p, Ä‘áº·t hÃ ng, xÃ¡c nháº­n thá»i gian giao hÃ ng.' },
  { phase:3, category:'MATERIAL',   priority:'HIGH',   title:'Nháº­n váº­t tÆ° vÃ  kiá»ƒm tra cháº¥t lÆ°á»£ng',                description:'Kiá»ƒm tra sá»‘ lÆ°á»£ng, quy cÃ¡ch, cháº¥t lÆ°á»£ng váº­t tÆ° khi nháº­n. Ghi biÃªn báº£n bÃ n giao kho.' },
  { phase:3, category:'PRODUCTION', priority:'HIGH',   title:'LÃªn káº¿ hoáº¡ch sáº£n xuáº¥t chi tiáº¿t',                    description:'PhÃ¢n cÃ´ng ca mÃ¡y, nhÃ¢n lá»±c, thá»© tá»± sáº£n xuáº¥t tá»«ng háº¡ng má»¥c theo deadline.' },
  { phase:3, category:'PROJECT',    priority:'HIGH',   title:'Ra file CNC (Nesting & Cutting List)',               description:'Xuáº¥t file tá»« pháº§n má»m thiáº¿t káº¿, tá»‘i Æ°u nesting tiáº¿t kiá»‡m váº­t liá»‡u.' },
  { phase:3, category:'EQUIPMENT',  priority:'MEDIUM', title:'Kiá»ƒm tra vÃ  chuáº©n bá»‹ mÃ¡y mÃ³c thiáº¿t bá»‹',             description:'Vá»‡ sinh, báº£o dÆ°á»¡ng mÃ¡y CNC, mÃ¡y cÆ°a, mÃ¡y chÃ  nhÃ¡m trÆ°á»›c khi vÃ o ca sáº£n xuáº¥t.' },
  { phase:3, category:'PERSONNEL',  priority:'MEDIUM', title:'PhÃ¢n cÃ´ng nhÃ¢n sá»± vÃ  giao ca sáº£n xuáº¥t',             description:'Láº­p lá»‹ch ca lÃ m viá»‡c, phÃ¢n cÃ´ng thá»£ theo tá»«ng háº¡ng má»¥c cá»¥ thá»ƒ.' },
  { phase:3, category:'PRODUCTION', priority:'MEDIUM', title:'Chuáº©n bá»‹ khu vá»±c sáº£n xuáº¥t vÃ  máº«u kiá»ƒm tra',        description:'Dá»n dáº¹p xÆ°á»Ÿng, chuáº©n bá»‹ jig gÃ¡ láº¯p, cáº¯t thá»­ máº«u kiá»ƒm tra sai sá»‘ trÆ°á»›c khi cháº¡y hÃ ng loáº¡t.' },
  { phase:4, category:'PRODUCTION', priority:'HIGH',   title:'Cáº¯t táº¥m CNC vÃ  vÃ¡n cÃ´ng nghiá»‡p',                   description:'Cháº¡y mÃ¡y CNC cáº¯t cÃ¡c chi tiáº¿t theo file Ä‘Ã£ ra. Kiá»ƒm tra sai sá»‘ tá»«ng lÃ´.' },
  { phase:4, category:'PRODUCTION', priority:'HIGH',   title:'DÃ¡n cáº¡nh (edgebanding) vÃ  gia cÃ´ng hoÃ n thiá»‡n',    description:'DÃ¡n cáº¡nh PVC/ABS, phay rÃ£nh, khoan lá»— báº£n lá» theo báº£n váº½.' },
  { phase:4, category:'PRODUCTION', priority:'HIGH',   title:'Gia cÃ´ng chi tiáº¿t thá»§ cÃ´ng vÃ  Ä‘áº·c biá»‡t',           description:'LÃ m cÃ¡c chi tiáº¿t Ä‘Ã²i há»i thá»§ cÃ´ng: cong, cháº¡m kháº¯c, uá»‘n, bo gÃ³c.' },
  { phase:4, category:'PRODUCTION', priority:'HIGH',   title:'Láº¯p rÃ¡p thá»­ (trial assembly) táº¡i xÆ°á»Ÿng',           description:'Láº¯p thá»­ tá»«ng bá»™ tá»§/ká»‡ Ä‘á»ƒ kiá»ƒm tra khá»›p ná»‘i, khe há»Ÿ, tháº©m má»¹ trÆ°á»›c khi sÆ¡n.' },
  { phase:4, category:'PRODUCTION', priority:'HIGH',   title:'SÆ¡n phá»§ hoÃ n thiá»‡n (paint & finish)',               description:'SÆ¡n lÃ³t, sÆ¡n mÃ u, phá»§ PU/UV theo mÃ u khÃ¡ch chá»n. Kiá»ƒm tra Ä‘á»™ bÃ³ng, mÃ u sáº¯c.' },
  { phase:4, category:'PRODUCTION', priority:'MEDIUM', title:'Láº¯p phá»¥ kiá»‡n (ray há»™p, báº£n lá», tay náº¯m)',          description:'Láº¯p Ä‘áº§y Ä‘á»§ phá»¥ kiá»‡n theo báº£n váº½: ray Blum/Hettich, báº£n lá», tay náº¯m, Ä‘Ã¨n LED.' },
  { phase:4, category:'PRODUCTION', priority:'HIGH',   title:'Kiá»ƒm tra cháº¥t lÆ°á»£ng (QC) táº¡i xÆ°á»Ÿng',              description:'KCS kiá»ƒm tra tá»«ng sáº£n pháº©m: kÃ­ch thÆ°á»›c, mÃ u sáº¯c, chá»©c nÄƒng, hoÃ n thiá»‡n bá» máº·t.' },
  { phase:4, category:'MATERIAL',   priority:'MEDIUM', title:'ÄÃ³ng gÃ³i vÃ  ghi nhÃ£n sáº£n pháº©m',                    description:'Bá»c mÃºt/thÃ¹ng carton, ghi nhÃ£n tá»«ng há»™p: tÃªn háº¡ng má»¥c, vá»‹ trÃ­ láº¯p Ä‘áº·t, sá»‘ thá»© tá»±.' },
  { phase:4, category:'PRODUCTION', priority:'HIGH',   title:'Xuáº¥t kho vÃ  bÃ n giao xe váº­n chuyá»ƒn',               description:'Láº­p phiáº¿u xuáº¥t kho, bÃ n giao cho Ä‘á»™i váº­n chuyá»ƒn, kiá»ƒm Ä‘áº¿m trÆ°á»›c khi lÃªn xe.' },
  { phase:5, category:'PRODUCTION', priority:'HIGH',   title:'XÃ¡c nháº­n cÃ´ng trÃ¬nh Ä‘á»§ Ä‘iá»u kiá»‡n láº¯p Ä‘áº·t',         description:'Kiá»ƒm tra trÆ°á»›c khi Ä‘áº¿n: Ä‘iá»‡n hoÃ n thiá»‡n, sÃ n Ä‘á»§ cá»©ng, tÆ°á»ng sÆ¡n xong, máº·t báº±ng thÃ´ng.' },
  { phase:5, category:'PRODUCTION', priority:'HIGH',   title:'Váº­n chuyá»ƒn hÃ ng Ä‘áº¿n cÃ´ng trÃ¬nh',                   description:'Theo dÃµi váº­n chuyá»ƒn, Ä‘áº£m báº£o an toÃ n hÃ ng hÃ³a, xÃ¡c nháº­n Ä‘áº¿n nÆ¡i nguyÃªn váº¹n.' },
  { phase:5, category:'PRODUCTION', priority:'HIGH',   title:'Bá»‘c dá»¡ vÃ  sáº¯p xáº¿p hÃ ng táº¡i cÃ´ng trÃ¬nh',           description:'Bá»‘c dá»¡ cáº©n tháº­n, Ä‘Æ°a vÃ o Ä‘Ãºng vá»‹ trÃ­ phÃ²ng, kiá»ƒm tra láº¡i sá»‘ lÆ°á»£ng há»™p.' },
  { phase:5, category:'PRODUCTION', priority:'HIGH',   title:'Láº¯p Ä‘áº·t ná»™i tháº¥t táº¡i cÃ´ng trÃ¬nh',                  description:'Láº¯p Ä‘áº·t theo báº£n váº½, cÃ¢n chá»‰nh thá»§y bÃ¬nh, cá»‘ Ä‘á»‹nh vÃ o tÆ°á»ng/sÃ n.' },
  { phase:5, category:'PRODUCTION', priority:'HIGH',   title:'Láº¯p Ä‘áº·t phá»¥ kiá»‡n vÃ  há»‡ thá»‘ng Ä‘iá»‡n ná»™i tháº¥t',      description:'Láº¯p Ä‘Ã¨n LED, á»• Ä‘iá»‡n Ã¢m tá»§, há»‡ thá»‘ng má»Ÿ hÆ¡i (Servo, Aventos).' },
  { phase:5, category:'PRODUCTION', priority:'HIGH',   title:'Vá»‡ sinh vÃ  hoÃ n thiá»‡n sau láº¯p Ä‘áº·t',               description:'Lau sáº¡ch bá»¥i báº©n, thÃ¡o bÄƒng dÃ­nh báº£o vá»‡, kiá»ƒm tra láº§n cuá»‘i trÆ°á»›c bÃ n giao.' },
  { phase:5, category:'PRODUCTION', priority:'HIGH',   title:'Nghiá»‡m thu cháº¥t lÆ°á»£ng táº¡i cÃ´ng trÃ¬nh (KCS)',       description:'KCS kiá»ƒm tra láº§n cuá»‘i: chá»©c nÄƒng, tháº©m má»¹, an toÃ n. Chá»¥p áº£nh nghiá»‡m thu.' },
  { phase:5, category:'ADMIN',      priority:'HIGH',   title:'BÃ n giao vÃ  kÃ½ biÃªn báº£n nghiá»‡m thu vá»›i khÃ¡ch',    description:'KhÃ¡ch hÃ ng kiá»ƒm tra, kÃ½ biÃªn báº£n bÃ n giao, ghi nháº­n cÃ¡c Ä‘iá»ƒm cáº§n xá»­ lÃ½ (náº¿u cÃ³).' },
  { phase:5, category:'ADMIN',      priority:'MEDIUM', title:'Xá»­ lÃ½ cÃ¡c Ä‘iá»ƒm chá»‰nh sá»­a sau nghiá»‡m thu',         description:'Kháº¯c phá»¥c táº¥t cáº£ Ä‘iá»ƒm khÃ¡ch yÃªu cáº§u chá»‰nh sá»­a trong vÃ²ng thá»i gian cam káº¿t.' },
  { phase:6, category:'ADMIN',      priority:'HIGH',   title:'Xuáº¥t hÃ³a Ä‘Æ¡n vÃ  thu tiá»n quyáº¿t toÃ¡n',             description:'Xuáº¥t hÃ³a Ä‘Æ¡n GTGT, thu pháº§n cÃ²n láº¡i theo tiáº¿n Ä‘á»™ há»£p Ä‘á»“ng.' },
  { phase:6, category:'ORDER',      priority:'MEDIUM', title:'ChÄƒm sÃ³c khÃ¡ch hÃ ng sau bÃ n giao (after-sales)',  description:'LiÃªn há»‡ sau 1 tuáº§n, 1 thÃ¡ng Ä‘á»ƒ há»i thÄƒm, xá»­ lÃ½ phÃ¡t sinh báº£o hÃ nh (náº¿u cÃ³).' },
  { phase:6, category:'ADMIN',      priority:'MEDIUM', title:'LÆ°u trá»¯ há»“ sÆ¡ dá»± Ã¡n hoÃ n chá»‰nh',                 description:'Scan vÃ  lÆ°u: há»£p Ä‘á»“ng, báº£n váº½, biÃªn báº£n, hÃ³a Ä‘Æ¡n vÃ o há»‡ thá»‘ng.' },
  { phase:6, category:'PROJECT',    priority:'MEDIUM', title:'Tá»•ng káº¿t dá»± Ã¡n: chi phÃ­, lá»£i nhuáº­n, bÃ i há»c',     description:'So sÃ¡nh doanh thu vs chi phÃ­ thá»±c táº¿. Äá»‘i chiáº¿u BOM. Ghi bÃ i há»c kinh nghiá»‡m.' },
  { phase:6, category:'ORDER',      priority:'LOW',    title:'Xin Ä‘Ã¡nh giÃ¡ vÃ  pháº£n há»“i tá»« khÃ¡ch hÃ ng',          description:'Nhá» khÃ¡ch Ä‘á»ƒ láº¡i Ä‘Ã¡nh giÃ¡, xin áº£nh cÃ´ng trÃ¬nh hoÃ n thiá»‡n Ä‘á»ƒ lÃ m portfolio.' },
];

const TEMPLATES: Record<string, TaskDef[]> = {
  LIGHT:    TEMPLATE_LIGHT,
  STANDARD: TEMPLATE_STANDARD,
  FULL:     TEMPLATE_FULL,
};

// â”€â”€â”€ GET: Danh sÃ¡ch dá»± Ã¡n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function GET(req: Request) {
  try {
    const { session, error } = await requireAuth(req as any, ALL_ROLES);
    if (error) return error;
    const projects = await db.select().from(pwrProjects)
      .where(eq(pwrProjects.userId, session.id))
      .orderBy(desc(pwrProjects.createdAt));
    return NextResponse.json({ projects });
  } catch (err) {
    console.error('GET /api/pwr/projects:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// â”€â”€â”€ POST: Táº¡o dá»± Ã¡n má»›i + template â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function POST(req: Request) {
  try {
    const { session, error } = await requireAuth(req as any, ALL_ROLES);
    if (error) return error;

    const body = await req.json();
    const { name, customer, deadline, notes, color, templateType } = body;

    if (!name?.trim()) return NextResponse.json({ error: 'TÃªn dá»± Ã¡n khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng' }, { status: 400 });

    const [project] = await db.insert(pwrProjects).values({
      userId:   session.id,
      name:     name.trim(),
      ...(customer ? { customer: customer.trim() } : {}),
      ...(deadline  ? { deadline } : {}),
      ...(notes     ? { notes: notes.trim() } : {}),
      ...(color     ? { color } : {}),
    } as any).returning();

    let createdTasks = 0;
    const tpl = templateType ? TEMPLATES[templateType] : null;
    if (tpl) {
      const taskValues = tpl.map(t => ({
        userId:      session.id,
        title:       t.title,
        description: t.description,
        category:    t.category,
        priority:    t.priority,
        status:      'TODO' as const,
        projectRef:  name.trim(),
        source:      'SELF' as const,
        tags:        [`giai-doan-${t.phase}`],
      }));
      await db.insert(pwrTasks).values(taskValues as any);
      createdTasks = taskValues.length;
    }

    return NextResponse.json({ project, createdTasks, templateType: templateType ?? null }, { status: 201 });
  } catch (err) {
    console.error('POST /api/pwr/projects:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

