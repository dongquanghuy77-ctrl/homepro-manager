const fs = require('fs');
let code = fs.readFileSync('src/components/pwr/station/MobileStationClient.tsx', 'utf8');

const replacement = `  if (activeStation) {
    return (
      <div className="app-container" style={{ margin: '0 auto', overflowX: 'hidden' }}>
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
        <div className="app-overlay" style={{ background: 'linear-gradient(180deg, rgba(3,3,10,0.85) 0%, rgba(3,3,10,0.7) 40%, rgba(3,3,10,0.98) 100%)' }} />
        <div className="content-wrapper" style={{ minHeight: '100vh', position: 'relative', zIndex: 10, padding: 20 }}>
          <StationWorkflowUI stationId={activeStation} onBack={() => setActiveStation(null)} />
        </div>
      </div>
    );
  }`;

const regex = /if\s*\(activeStation\)\s*\{\s*return\s*<StationWorkflowUI[\s\S]*?setActiveStation\(null\)\}\s*\/>;\s*\}/;
code = code.replace(regex, replacement);

fs.writeFileSync('src/components/pwr/station/MobileStationClient.tsx', code, 'utf8');
