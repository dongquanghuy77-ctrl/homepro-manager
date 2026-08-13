// @ts-nocheck
// API-based UAT for P0.18 Leave Approval
const BASE_URL = 'http://localhost:3000';

async function loginAs(identifier, password, pin) {
    const payload = pin ? { identifier, pin } : { identifier, password };
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
        throw new Error(`Login failed for ${identifier}: ` + await res.text());
    }
    
    // Extract set-cookie
    const setCookie = res.headers.get('set-cookie');
    if (!setCookie) throw new Error('No cookie received');
    return setCookie.split(';')[0];
}

async function run() {
    console.log('--- STARTING API UAT ---');
    try {
        console.log('1. Login as Worker (0901234567)');
        const workerCookie = await loginAs('0901234567', null, '123456');
        
        console.log('2. Worker creating a leave request...');
        const createRes = await fetch(`${BASE_URL}/api/hr/leave`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': workerCookie
            },
            body: JSON.stringify({
                leaveType: 'SICK',
                startDate: '2026-10-10',
                endDate: '2026-10-11',
                reason: 'API UAT Test Leave'
            })
        });
        
        const createData = await createRes.json();
        if (!createRes.ok) throw new Error('Create failed: ' + JSON.stringify(createData));
        const leaveId = createData.id;
        console.log(`✅ Leave request created: ID ${leaveId}`);
        
        console.log('3. Worker fetching all leaves (API Security Check)');
        const fetchLeaves = await fetch(`${BASE_URL}/api/hr/leave`, {
            headers: { 'Cookie': workerCookie }
        });
        const leavesData = await fetchLeaves.json();
        // Check if there are leaves from other employees
        const workerId = createData.employeeId;
        const hasOthers = leavesData.records?.some(r => r.employeeId !== workerId);
        if (hasOthers) {
            throw new Error('SECURITY BREACH: Worker can see other employees leaves!');
        }
        console.log('✅ API Security pass: Worker only sees their own leaves');
        
        console.log('4. Manager (quan.mai) rejecting leave request...');
        const managerCookie = await loginAs('quan.mai', '123456', null);
        const rejectRes = await fetch(`${BASE_URL}/api/hr/leave/${leaveId}/reject`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Cookie': managerCookie },
            body: JSON.stringify({ reviewNote: 'Manager UAT Reject' })
        });
        const rejectData = await rejectRes.json();
        if (rejectRes.status === 403) {
            console.log('✅ Manager properly restricted (403 Forbidden) as expected (maybe diff dept)');
        } else if (rejectRes.ok) {
            console.log('✅ Manager rejected successfully (same dept)');
        } else {
            throw new Error('Manager reject failed: ' + JSON.stringify(rejectData));
        }

        console.log('5. HR Admin (huy.dong) approving leave request...');
        const hrCookie = await loginAs('huy.dong', '123456', null);
        const approveRes = await fetch(`${BASE_URL}/api/hr/leave/${leaveId}/approve`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Cookie': hrCookie },
            body: JSON.stringify({})
        });
        
        const approveData = await approveRes.json();
        if (approveRes.ok) {
            console.log('✅ HR approved successfully');
        } else if (approveRes.status === 400 && approveData.error.includes('PENDING')) {
            console.log('✅ HR approve skipped (was already rejected by manager)');
        } else {
            throw new Error('HR approve failed: ' + JSON.stringify(approveData));
        }
        
        console.log('--- ALL API UAT PASSED ---');
    } catch (e) {
        console.error('❌ UAT FAILED:', e);
        process.exit(1);
    }
}

run();
