const fs = require('fs');
let content = fs.readFileSync('src/components/pwr/station/StationAuthUI.tsx', 'utf8');

// Add 'update' to useSession
content = content.replace('const { data: session } = useSession();', 'const { data: session, update } = useSession();');

// After signIn success, call update()
const signInBlock = `        const res = await signIn('credentials', {
          redirect: false,
          username: phone,
          password: password,
        });
        setIsSubmitting(false);
        
        if (res?.error) {
          setAuthError(\`Lỗi: \${res.error} (Mã: \${res?.status})\`);
        } else {
          await update();
          setAuthState('WELCOME');
        }`;

content = content.replace(/const res = await signIn\('credentials', {[\s\S]*?setAuthState\('WELCOME'\);\n        }/m, signInBlock);

// Replace fallback hardcodes in WELCOME state
content = content.replace(/{session\?\.user\?\.name \|\| phone}/g, "{session?.user?.name || 'Đang tải...'}");
content = content.replace(/{session\?\.user\?\.name \? getInitials\(session\.user\.name\) : \(phone === '0866903420' \? 'AD' : 'ĐQ'\)}/g, "{session?.user?.name ? getInitials(session.user.name) : (phone === '0866903420' ? 'AD' : '...')}");

fs.writeFileSync('src/components/pwr/station/StationAuthUI.tsx', content);
console.log('Patched NextAuth useSession update trigger');
