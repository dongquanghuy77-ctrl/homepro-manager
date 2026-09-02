const fs = require('fs');
let content = fs.readFileSync('src/components/pwr/station/StationAuthUI.tsx', 'utf8');

content = content.replace("import { signIn } from 'next-auth/react';", "import { signIn, useSession } from 'next-auth/react';");

const hookInsertion = `  const router = useRouter();
  const { data: session } = useSession();

  const getInitials = (name) => {
    if (!name) return '??';
    const words = name.trim().split(' ').filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };
`;
content = content.replace('  const router = useRouter();', hookInsertion);

content = content.replace(/{phone \|\| 'Đồng Quang Huy'}/g, '{session?.user?.name || phone}');
content = content.replace(/{phone === '0866903420' \? 'AD' : 'ĐQ'}/g, "{session?.user?.name ? getInitials(session.user.name) : (phone === '0866903420' ? 'AD' : 'ĐQ')}");

content = content.replace(/phone === '0866903420'/g, "(session?.user?.role === 'PWR_ADMIN' || phone === '0866903420')");
content = content.replace(/phone !== '0866903420'/g, "(session?.user?.role !== 'PWR_ADMIN' && phone !== '0866903420')");

fs.writeFileSync('src/components/pwr/station/StationAuthUI.tsx', content);
console.log('Patched UI with dynamic session data');
