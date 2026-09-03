// Script tạo BLOB_READ_WRITE_TOKEN thông qua Vercel CLI token
// Dùng vercel CLI đã được link với project
const { execSync } = require('child_process');

try {
  // Lấy token từ vercel whoami + credentials
  const result = execSync('npx vercel whoami', { encoding: 'utf8', cwd: process.cwd() });
  console.log('Vercel user:', result.trim());
} catch(e) {
  console.log('Error:', e.message);
}

// Thử lấy env vars hiện tại từ project
try {
  const envResult = execSync('npx vercel env ls production', { encoding: 'utf8', cwd: process.cwd() });
  console.log('\nProduction env vars:');
  console.log(envResult);
} catch(e) {
  console.log('Env ls error:', e.message.substring(0, 200));
}
