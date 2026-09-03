const fs = require('fs');
let c = fs.readFileSync('src/components/pwr/station/MobileStationClient.tsx', 'utf8');

c = c.replace(/<span style=\{\{ fontSize: 10, background: '#a855f7', padding: '2px 6px', borderRadius: 4, marginLeft: 8 \}\}>TR.M C.A B.N<\/span>/g, `<span style={{ fontSize: 10, background: '#a855f7', padding: '2px 6px', borderRadius: 4, marginLeft: 8, whiteSpace: 'nowrap', display: 'inline-block' }}>TRẠM CỦA BẠN</span>`);
c = c.replace(/<span style=\{\{ fontSize: 10, background: '#10b981', padding: '2px 6px', borderRadius: 4, marginLeft: 8 \}\}>TR.M C.A B.N<\/span>/g, `<span style={{ fontSize: 10, background: '#10b981', padding: '2px 6px', borderRadius: 4, marginLeft: 8, whiteSpace: 'nowrap', display: 'inline-block' }}>TRẠM CỦA BẠN</span>`);
c = c.replace(/<span style=\{\{ fontSize: 10, background: '#3b82f6', padding: '2px 6px', borderRadius: 4, marginLeft: 8 \}\}>TR.M C.A B.N<\/span>/g, `<span style={{ fontSize: 10, background: '#3b82f6', padding: '2px 6px', borderRadius: 4, marginLeft: 8, whiteSpace: 'nowrap', display: 'inline-block' }}>TRẠM CỦA BẠN</span>`);

fs.writeFileSync('src/components/pwr/station/MobileStationClient.tsx', c, 'utf8');
