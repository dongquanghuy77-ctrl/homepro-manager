import fs from 'fs';

const filePath = 'src/components/pwr/ingestion/PwrIngestionClient.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add Loader2 to lucide imports
content = content.replace(
  /import { UploadCloud, CheckCircle2, AlertCircle, Plus, FileText, ArrowRight, Server, ShieldAlert, Clock, XCircle, Info, Bell, Book, History, Download, MoreVertical, HelpCircle } from 'lucide-react';/,
  "import { UploadCloud, CheckCircle2, AlertCircle, Plus, FileText, ArrowRight, Server, ShieldAlert, Clock, XCircle, Info, Bell, Book, History, Download, MoreVertical, HelpCircle, Loader2 } from 'lucide-react';"
);

// 2. Add states
const statesToAdd = `
  const [uploadStep, setUploadStep] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS'>('IDLE');
  const [stats, setStats] = useState({ tasks: 0, materials: 0, projectName: '' });
  const [countdown, setCountdown] = useState(3);
  const [successBatchId, setSuccessBatchId] = useState('');

  useEffect(() => {
    let timer;
    if (uploadStep === 'SUCCESS' && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (uploadStep === 'SUCCESS' && countdown === 0) {
      router.push(\`/pwr/kanban?search=BATCH_\${successBatchId}\`);
    }
    return () => clearTimeout(timer);
  }, [uploadStep, countdown, router, successBatchId]);
`;

content = content.replace(
  /const \[showProjectHelp, setShowProjectHelp\] = useState<boolean>\(true\);/,
  "const [showProjectHelp, setShowProjectHelp] = useState<boolean>(true);\n" + statesToAdd
);

// 3. Update handleExecute
const handleExecuteRegex = /setIsUploading\(true\);\s*try {([\s\S]*?)const res = await fetch\('\/api\/pwr\/ingestion\/explode'([\s\S]*?)const result = await res\.json\(\);([\s\S]*?)if \(!res\.ok\) throw new Error\(result\.error\);\s*if \(result\.isShortage\) {[\s\S]*?else {[\s\S]*?}\s*router\.push\(`\/pwr\/kanban\?search=BATCH_\${batchId}`\);/g;

content = content.replace(handleExecuteRegex, (match, p1, p2, p3) => {
  return `setUploadStep('PROCESSING');
    try {${p1}const res = await fetch('/api/pwr/ingestion/explode'${p2}const result = await res.json();${p3}if (!res.ok) throw new Error(result.error);
      
      setStats({
        tasks: result.stats?.tasksGenerated || 0,
        materials: result.stats?.newMaterialsCount || 0,
        projectName: finalProjectName
      });
      setSuccessBatchId(batchId);
      setUploadStep('SUCCESS');`;
});

// Remove isUploading from disabled logic inside handleExecute because we use uploadStep now.
// Actually, isUploading is still used for file parsing. We'll leave it.

// 4. Append the overlay at the end of the return statement
const overlayContent = `
      {/* PROCESSING OVERLAY */}
      {uploadStep === 'PROCESSING' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <Loader2 size={48} color="#3b82f6" style={{ animation: 'spin 1s linear infinite', marginBottom: 24 }} />
          <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: '0 0 12px 0' }}>Đang bóc tách & phân bổ...</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 16 }}>Xin vui lòng không đóng trình duyệt lúc này.</p>
          <style dangerouslySetInnerHTML={{__html: \`@keyframes spin { 100% { transform: rotate(360deg); } }\`}} />
        </div>
      )}

      {/* SUCCESS MODAL */}
      {uploadStep === 'SUCCESS' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--color-surface)', width: 480, borderRadius: 16, padding: 32, textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
              <CheckCircle2 size={40} color="#10b981" />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0', color: 'var(--color-text)' }}>Đã Nổ Task Thành Công!</h2>
            <p style={{ fontSize: 15, color: 'var(--color-text-muted)', margin: '0 0 24px 0' }}>Dự án: <strong style={{ color: '#fff' }}>{stats.projectName}</strong></p>
            
            <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
              <div style={{ flex: 1, background: 'var(--color-bg)', padding: 16, borderRadius: 12, border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6', marginBottom: 4 }}>{stats.tasks}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Thẻ việc (Tasks)</div>
              </div>
              <div style={{ flex: 1, background: 'var(--color-bg)', padding: 16, borderRadius: 12, border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>{stats.materials}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Vật tư mới</div>
              </div>
            </div>
            
            <div style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16 }}>
              Chuyển hướng sang Bảng Kanban trong <strong>{countdown}</strong> giây...
            </div>
            
            <button 
              onClick={() => router.push(\`/pwr/kanban?search=BATCH_\${successBatchId}\`)}
              style={{ width: '100%', padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
            >
              Đi tới Kanban Ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
`;

content = content.replace(/    <\/div>\n  \);\n}/, overlayContent);

fs.writeFileSync(filePath, content);
console.log('UI updated successfully!');
