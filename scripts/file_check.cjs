const fs = require('fs');
let pass=0, fail=0;
function check(name, ok, detail) {
  if (ok) { console.log("  PASS: "+name+(detail?" ("+detail+")":"")); pass++; }
  else     { console.log("  FAIL: "+name+(detail?" ("+detail+")":"")); fail++; }
}
const nav = fs.readFileSync("src/config/navigation.ts","utf8");
check("nav: Daily Focus -> /pwr/focus", nav.includes("href: '/pwr/focus'"), "");
check("nav: Tien Do -> /pwr/reports/projects", nav.includes("/pwr/reports/projects"), "");
check("nav: pwr-progress item exists", nav.includes("pwr-progress"), "");
const list = fs.readFileSync("src/components/pwr/kanban/PwrListView.tsx","utf8");
check("ListView: Trash2 import", list.includes("Trash2"), "");
check("ListView: bulk action requestAction", list.includes("requestAction"), "");
check("ListView: onRefresh prop", list.includes("onRefresh"), "");
const wbs = fs.readFileSync("src/components/pwr/kanban/PwrWbsView.tsx","utf8");
check("WBS: Archive import", wbs.includes("Archive"), "");
check("WBS: Trash2 import", wbs.includes("Trash2"), "");
check("WBS: archive action button", wbs.includes("action=archive"), "");
check("WBS: delete action button", wbs.includes("action=delete"), "");
check("Project [id] API exists", fs.existsSync("src/app/api/pwr/projects/[id]/route.ts"), "");
const taskApi = fs.readFileSync("src/app/api/pwr/tasks/route.ts","utf8");
check("Tasks API: DELETE handler", taskApi.includes("export async function DELETE"), "");
check("Tasks API: bulk ids support", taskApi.includes("body.ids"), "");
const sidebar = fs.readFileSync("src/components/layout/Sidebar.tsx","utf8");
check("Sidebar: pwr-progress color defined", sidebar.includes("pwr-progress"), "");
console.log("\n=== FILE CHECK: "+pass+" PASS, "+fail+" FAIL ===");