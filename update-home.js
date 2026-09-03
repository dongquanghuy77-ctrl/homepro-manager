const fs = require('fs');
let c = fs.readFileSync('src/components/pwr/station/HomeTabUI.tsx', 'utf8');

c = c.replace(/import \{ LogOut, Sun, Coffee, CheckCircle2, TrendingUp, Bell \} from "lucide-react";/, `import { LogOut, Sun, Coffee, CheckCircle2, TrendingUp, Bell, AlertCircle, Clock } from "lucide-react";`);

const insertion = `
      {data?.urgentTasks && data.urgentTasks.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444' }}>
            <AlertCircle size={20} color="#ef4444" /> Việc khẩn cấp (Ưu tiên cao)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.urgentTasks.map((task: any) => (
              <div key={task.id} className="glass-card" style={{ padding: 16, borderLeft: '4px solid #ef4444', position: 'relative' }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, paddingRight: 60 }}>{task.title}</div>
                <div style={{ fontSize: 13, color: '#fca5a5', marginBottom: 8 }}>{task.description || 'Yêu cầu xử lý ngay để không tắc chuyền'}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> {new Date(task.updatedAt || task.createdAt).toLocaleTimeString('vi-VN')}
                </div>
                <button 
                  onClick={() => window.location.href = \`/pwr/tasks/\${task.id}\`}
                  style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  XỬ LÝ
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
`;

c = c.replace(/    <\/div>\n  \);\n\}/, insertion + `    </div>\n  );\n}`);

fs.writeFileSync('src/components/pwr/station/HomeTabUI.tsx', c, 'utf8');
