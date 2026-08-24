
const fs = require('fs');
let code = fs.readFileSync('src/components/pwr/tasks/PwrTaskDetailClient.tsx', 'utf8');

const regex = /<div id=\"task-pdf-template\"[\\s\\S]*?<!-- Hidden PDF Template -->/g;
// Wait, regex might be tricky if it matches too much.
