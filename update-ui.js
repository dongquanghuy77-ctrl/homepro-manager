const fs = require('fs');
let code = fs.readFileSync('src/components/pwr/station/MobileStationClient.tsx', 'utf8');

// Add notifications state
const targetState = '  const [isSidebarOpen, setSidebarOpen] = useState(false);';
const newState = `  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  // Real-time Notification Engine (Short Polling)
  useEffect(() => {
    const fetchNotifs = async () => {
      if (!currentStation) return;
      try {
        const res = await fetch(\`/api/pwr/station/notifications?stationTeam=\${currentStation.id}\`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch (e) {}
    };
    
    fetchNotifs();
    const intv = setInterval(fetchNotifs, 15000);
    return () => clearInterval(intv);
  }, [currentStation]);`;

if (code.includes(targetState)) {
  code = code.replace(targetState, newState);
} else {
  console.log("Could not find targetState");
}

// Modify Bell Icon rendering
// Look for <Bell size={20} color="var(--color-primary)" />
const bellTarget = `<div style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(139, 92, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 10, 25, 0.6)' }}>
              <Bell size={20} color="var(--color-primary)" />
            </div>`;
const bellReplacement = `<div style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(139, 92, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 10, 25, 0.6)', cursor: 'pointer' }}>
              <Bell size={20} color="var(--color-primary)" style={{ animation: notifications.length > 0 ? 'swing 2s ease-in-out infinite' : 'none' }} />
              {notifications.length > 0 && (
                <div style={{ position: 'absolute', top: -2, right: -2, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 'bold', width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)' }}>
                  {notifications.length}
                </div>
              )}
            </div>`;

if (code.includes(bellTarget)) {
  code = code.replace(bellTarget, bellReplacement);
}

// Ensure CSS keyframes are added for the swinging bell effect
const cssTarget = `.app-overlay {`;
const cssReplacement = `@keyframes swing {
        0%, 100% { transform: rotate(0deg); }
        20% { transform: rotate(15deg); }
        40% { transform: rotate(-10deg); }
        60% { transform: rotate(5deg); }
        80% { transform: rotate(-5deg); }
      }
      .app-overlay {`;

if (code.includes(cssTarget) && !code.includes('@keyframes swing')) {
  code = code.replace(cssTarget, cssReplacement);
}

fs.writeFileSync('src/components/pwr/station/MobileStationClient.tsx', code, 'utf8');
console.log('Modified UI');
