import { execSync } from 'child_process';

const VERCEL_URL = 'https://homepro-manager-psi.vercel.app';

async function checkDeployment() {
    console.log("=== VERCEL DEPLOYMENT & GIT VERIFICATION ===\n");

    try {
        const gitSha = execSync('git rev-parse HEAD').toString().trim();
        console.log(`[GIT] Local HEAD SHA: ${gitSha}`);
        
        const gitStatus = execSync('git status --porcelain').toString().trim();
        if (gitStatus.length > 0) {
            console.log(`[GIT] Uncommitted changes detected:\n${gitStatus}`);
            console.log(`\n❌ ERROR: Cannot verify production deployment with uncommitted changes.`);
            process.exit(1);
        } else {
            console.log(`[GIT] Working tree is clean.`);
        }

        console.log(`\n[VERCEL] Fetching live URL: ${VERCEL_URL}`);
        const response = await fetch(VERCEL_URL);
        
        console.log(`[VERCEL] HTTP Status: ${response.status}`);
        
        const vercelId = response.headers.get('x-vercel-id');
        if (vercelId) {
            console.log(`[VERCEL] Deployment ID (x-vercel-id): ${vercelId}`);
        } else {
            console.log(`[VERCEL] No x-vercel-id header found.`);
        }

        console.log("\n⚠️ IMPORTANT: To fully verify the Vercel deployment SHA matches the Git SHA:");
        console.log(`1. Go to the Vercel Dashboard for this project.`);
        console.log(`2. Check the 'Deployments' tab.`);
        console.log(`3. Verify that the latest Production deployment corresponds to Git SHA: ${gitSha}`);
        console.log(`4. If they match, update docs/FULL-SYSTEM-GO-LIVE-ACCEPTANCE.md manually.`);

    } catch (error) {
        console.error("Verification failed:", error.message);
    }
}

checkDeployment();
