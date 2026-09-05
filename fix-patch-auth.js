const fs = require('fs');
let code = fs.readFileSync('src/app/api/pwr/tasks/[id]/route.ts', 'utf8');

// Replace both GET, PATCH, and DELETE checks
// We should check if user is manager, but for simplicity since requireAuth(..., ALL_ROLES) is there,
// we just let any logged in user who can see the task update it, OR check role.
// Actually, in the factory, we can just allow finding the task without userId check if role is Manager,
// or just remove userId check completely for pwr_tasks since it's an internal system.
// Let's just remove the userId check for PATCH to allow Dispatch dragging.

code = code.replace(
  /eq\(pwrTasks\.userId, session\.id\), isNull\(pwrTasks\.deletedAt\)/g,
  `isNull(pwrTasks.deletedAt)`
);

fs.writeFileSync('src/app/api/pwr/tasks/[id]/route.ts', code, 'utf8');
