const fs = require('fs');
let code = fs.readFileSync('src/components/pwr/kanban/PwrWbsView.tsx', 'utf8');

const target = \                      {/* TASK ROWS */}
                      {isCatExp && (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {catTasks.sort((a, b) => a.id - b.id).map(task => {
                            const statusDef = PWR_STATUS[task.status as PwrStatus];\;

const replacement = \                      {/* TASK ROWS */}
                      {isCatExp && (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {(() => {
                            const batchGroups: Record<string, PwrTask[]> = {};
                            const noBatch: PwrTask[] = [];
                            catTasks.forEach(task => {
                              const batchTag = (task.tags || []).find((tag: string) => tag.startsWith('BATCH_'));
                              if (batchTag) {
                                if (!batchGroups[batchTag]) batchGroups[batchTag] = [];
                                batchGroups[batchTag].push(task);
                              } else {
                                noBatch.push(task);
                              }
                            });

                            const renderTaskRow = (task: PwrTask, isLastInBatch: boolean) => {
                              const statusDef = PWR_STATUS[task.status as PwrStatus];\;

const endTarget = \                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}\;

const endReplacement = \                                </div>
                              </Link>
                            );
                            };

                            return (
                              <>
                                {Object.entries(batchGroups).map(([batchId, bTasks]) => (
                                  <div key={batchId} style={{ borderBottom: '2px solid var(--color-border)', marginBottom: 16 }}>
                                    <div style={{ padding: '8px 24px', background: 'rgba(59, 130, 246, 0.05)', fontSize: 13, fontWeight: 700, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 8 }}>
                                      Lô: {batchId.replace('BATCH_', '')}
                                    </div>
                                    {bTasks.sort((a, b) => a.id - b.id).map((t, idx) => renderTaskRow(t, idx === bTasks.length - 1))}
                                  </div>
                                ))}
                                {noBatch.length > 0 && (
                                  <div style={{ marginBottom: 16 }}>
                                    {Object.keys(batchGroups).length > 0 && (
                                      <div style={{ padding: '8px 24px', background: 'var(--color-surface-2)', fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        Công việc khác
                                      </div>
                                    )}
                                    {noBatch.sort((a, b) => a.id - b.id).map(t => renderTaskRow(t, false))}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}\;

if(code.includes(target) && code.includes(endTarget)) {
  code = code.replace(target, replacement);
  code = code.replace(endTarget, endReplacement);
  fs.writeFileSync('src/components/pwr/kanban/PwrWbsView.tsx', code);
  console.log('SUCCESS');
} else {
  console.log('FAILED TO MATCH');
}
