const fs = require('fs');
let code = fs.readFileSync('src/components/pwr/station/MobileStationClient.tsx', 'utf8');

const injectionPoint = "const router = useRouter();";
const injectedCode = `const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  
  useEffect(() => {
    let team = 'CNC';
    const savedTeam = localStorage.getItem('pwr_selected_team');
    if (savedTeam === 'Tổ Cắt') team = 'CNC';
    else if (savedTeam === 'Tổ Dán') team = 'DAN_CANH';
    else if (savedTeam === 'Tổ Khoan') team = 'KHOAN_CAM';

    const fetchNotifs = async () => {
      try {
        const res = await fetch(\`/api/pwr/station/notifications?stationTeam=\${team}\`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch (e) {}
    };
    
    fetchNotifs();
    const intv = setInterval(fetchNotifs, 15000); // 15s poll
    return () => clearInterval(intv);
  }, []);
`;
code = code.replace(injectionPoint, injectedCode);

// Bell Icon replacement
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

fs.writeFileSync('src/components/pwr/station/MobileStationClient.tsx', code, 'utf8');
console.log('Modified UI polling');
