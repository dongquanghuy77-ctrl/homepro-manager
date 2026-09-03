const fs = require('fs');
let content = fs.readFileSync('src/components/pwr/station/MobileStationClient.tsx', 'utf8');

const newCode = `const [userStationRole, setUserStationRole] = useState<string>('CNC');
  useEffect(() => {
    const savedTeam = localStorage.getItem('pwr_selected_team');
    if (savedTeam === 'Tổ Cắt') setUserStationRole('CNC');
    else if (savedTeam === 'Tổ Dán') setUserStationRole('DAN_CANH');
    else if (savedTeam === 'Tổ Khoan') setUserStationRole('KHOAN_CAM');
  }, []);`;

content = content.replace("const userStationRole: string = 'CNC'; // MOCK", newCode);

fs.writeFileSync('src/components/pwr/station/MobileStationClient.tsx', content);
console.log('Fixed hardcoded userStationRole mock');
