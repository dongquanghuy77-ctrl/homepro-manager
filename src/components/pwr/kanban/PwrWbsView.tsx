import { useState } from 'react';
import type { PwrTask, PwrStatus } from '@/db/schema';
import { ChevronRight, ChevronDown, FolderGit2, FolderOpen, CheckCircle2, Clock, AlertCircle, PlayCircle, Loader2 } from 'lucide-react';
import { PWR_PRIORITY, PWR_STATUSES } from '@/lib/pwr/constants';
import Link from 'next/link';

interface Props {
  tasks: PwrTask[];
}

export default function PwrWbsView({ tasks }: Props) {
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleProject = (p: string) => setExpandedProjects(prev => ({ ...prev, [p]: !prev[p] }));
  const toggleCategory = (p: string, c: string) => {
    const key = \`\${p}-\${c}\`;
    setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // 1. Group by Project
  const projectsMap: Record<string, PwrTask[]> = {};
  tasks.forEach(t => {
    const p = t.projectRef || 'Dự án nội bộ / Khác';
    if (!projectsMap[p]) projectsMap[p] = [];
    projectsMap[p].push(t);
  });

  const getStatusIcon = (status: PwrStatus) => {
    switch(status) {
      case 'DONE': return <CheckCircle2 size={14} color="#10b981" />;
      case 'IN_PROGRESS': return <Loader2 size={14} color="#3b82f6" className="pwr-spin" />;
      case 'WAITING': return <Clock size={14} color="#f59e0b" />;
      case 'TODO': return <PlayCircle size={14} color="#8b5cf6" />;
      case 'INBOX': return <AlertCircle size={14} color="#ef4444" />;
      default: return <CheckCircle2 size={14} color="#64748b" />;
    }
  };

  return (
    <div style={{ padding: '0 24px 40px', color: '#f8fafc' }}>
      
      {Object.keys(projectsMap).sort().map(projName => {
        const projTasks = projectsMap[projName];
        const isProjExp = expandedProjects[projName] !== false; // Default expanded

        // 2. Group by Category within Project
        const catMap: Record<string, PwrTask[]> = {};
        projTasks.forEach(t => {
          const c = t.category || 'Khác';
          if (!catMap[c]) catMap[c] = [];
          catMap[c].push(t);
        });

        return (
          <div key={projName} style={{ marginBottom: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden' }}>
            
            {/* Level 1: Project Header */}
            <div 
              onClick={() => toggleProject(projName)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', cursor: 'pointer', background: isProjExp ? 'rgba(59, 130, 246, 0.05)' : 'transparent', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = isProjExp ? 'rgba(59, 130, 246, 0.05)' : 'transparent'}
            >
              <div style={{ color: '#94a3b8' }}>
                {isProjExp ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </div>
              <div style={{ color: '#3b82f6' }}>
                {isProjExp ? <FolderOpen size={20} /> : <FolderGit2 size={20} />}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.5 }}>
                {projName.toUpperCase()}
              </div>
              <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                {projTasks.length} việc
              </div>
            </div>

            {/* Level 2 & 3 */}
            {isProjExp && (
              <div style={{ padding: '8px 0 16px 44px' }}>
                {Object.keys(catMap).sort().map(catName => {
                  const catTasks = catMap[catName];
                  const cKey = \`\${projName}-\${catName}\`;
                  const isCatExp = expandedCategories[cKey] !== false;

                  return (
                    <div key={catName} style={{ position: 'relative', marginTop: 12 }}>
                      {/* Vertical Guideline */}
                      <div style={{ position: 'absolute', left: 8, top: 28, bottom: 0, width: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }} />

                      {/* Category Header */}
                      <div 
                        onClick={() => toggleCategory(projName, catName)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderRadius: 8 }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ color: '#64748b' }}>
                          {isCatExp ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
                          Phân loại: {catName}
                        </div>
                      </div>

                      {/* Level 3: Tasks */}
                      {isCatExp && (
                        <div style={{ paddingLeft: 24, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {catTasks.sort((a,b) => a.id - b.id).map((task, idx) => {
                            const statusDef = PWR_STATUSES.find(s => s.id === task.status);
                            const prioDef = PWR_PRIORITY[task.priority as PwrPriority];

                            return (
                              <Link key={task.id} href={\`/pwr/tasks/\${task.id}\`} style={{ textDecoration: 'none' }}>
                                <div 
                                  style={{ 
                                    display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px', 
                                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', 
                                    borderRadius: 10, position: 'relative' 
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}
                                >
                                  {/* Horizontal tree branch */}
                                  <div style={{ position: 'absolute', left: -16, top: '50%', width: 16, height: 2, background: 'rgba(255,255,255,0.05)' }} />

                                  <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', width: 20 }}>
                                    {idx + 1}.
                                  </div>

                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 500, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {task.title}
                                    </div>
                                  </div>

                                  {/* Badges */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {task.dueDate && (
                                      <div style={{ fontSize: 12, color: '#64748b', marginRight: 8 }}>
                                        {task.dueDate}
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: statusDef?.color, background: \`\${statusDef?.color}15\`, padding: '4px 10px', borderRadius: 20, border: \`1px solid \${statusDef?.color}30\` }}>
                                      {getStatusIcon(task.status as PwrStatus)}
                                      {statusDef?.label}
                                    </div>
                                    {prioDef && (
                                      <div style={{ fontSize: 10, fontWeight: 700, color: prioDef.color, background: \`\${prioDef.color}15\`, padding: '4px 8px', borderRadius: 6, textTransform: 'uppercase' }}>
                                        {prioDef.label}
                                      </div>
                                    )}
                                  </div>

                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
