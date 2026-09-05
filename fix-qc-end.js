const fs = require('fs');
let code = fs.readFileSync('src/components/pwr/station/QcKioskUI.tsx', 'utf8');

code = code.replace(/    <\/div>\n  \);\n\}/, "    </div>\n    </div>\n  );\n}");
fs.writeFileSync('src/components/pwr/station/QcKioskUI.tsx', code, 'utf8');
