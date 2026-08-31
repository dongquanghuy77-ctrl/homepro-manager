import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrMaterials, pwrMaterialTransactions, pwrTasks, pwrTaskDependencies, pwrTaskResources, pwrResources, pwrProjects, pwrResourceCalendar } from '@/db/schema';
import { eq, sql, inArray, and, gte, lte } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req as any, ALL_ROLES);
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const body = await req.json();
    const { items, fileName, batchId, projectId, projectName, isNewProject, newProjectType, batchName, maxDailyHours, geoStats } = body;
    const userId = session.id;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Không có vật tư để Nổ Task' }, { status: 400 });
    }

    let isShortageOut = false;
    let finalProjectId = projectId;
    let finalProjectName = projectName;
    let tasksGenerated = 0;
    let newMaterialsCount = 0;

    // [UAT INDEPENDENT AUDIT] SỬ DỤNG TRANSACTION ĐỂ CHỐNG RACE-CONDITION
    await db.transaction(async (tx) => {
      // 0. Tạo Dự án mới nếu được yêu cầu, hoặc lấy tên dự án cũ
      if (!isNewProject && finalProjectId) {
        const existingProj = await tx.select().from(pwrProjects).where(eq(pwrProjects.id, finalProjectId));
        if (existingProj.length > 0) {
          finalProjectName = existingProj[0].name;
        }
      }
      if (isNewProject && finalProjectName) {
        const [newProj] = await tx.insert(pwrProjects).values({
          userId,
          name: finalProjectName,
          notes: `[TYPE:${newProjectType || 'PROJECT'}] Tự động tạo từ Trạm Nuốt File`,
        }).returning();
        finalProjectId = newProj.id;
      }

      let materialIds = items.map((i: any) => i.dbMaterialId).filter(Boolean);
      let dbMats = materialIds.length > 0 
        ? await tx.select().from(pwrMaterials).where(inArray(pwrMaterials.id, materialIds))
        : [];
      
      // AUTO-MASTER DATA (Phương án B): Tự động tạo mã vật tư nếu chưa có trong DB
      const uniqueMissingMap = new Map();
      for (const item of items) {
        if (!item.dbMaterialId) {
          newMaterialsCount++;
          const key = (item.parsedName || item.rawName || 'Unknown').toLowerCase();
          if (!uniqueMissingMap.has(key)) {
            const [newMat] = await tx.insert(pwrMaterials).values({
              name: item.parsedName || item.rawName || 'Vật tư không tên',
              category: item.type || 'OTHER',
              unit: item.unit || 'Cái',
              stockLevel: 0,
              reservedLevel: 0,
              skuCode: `AUTO_${Date.now()}_${Math.floor(Math.random() * 1000)}`
            }).returning();
            uniqueMissingMap.set(key, newMat);
            dbMats.push(newMat);
          }
          item.dbMaterialId = uniqueMissingMap.get(key).id;
        }
      }
      
      let isShortage = false;
      let isBoardShortage = false;
      let isEdgeShortage = false;
      
      let allShortageNotes: string[] = [];
      let boardShortageNotes: string[] = [];
      let edgeShortageNotes: string[] = [];

      const reservationPlan = items.map((item: any) => {
        const mat = dbMats.find(m => m.id === item.dbMaterialId);
        const available = mat ? mat.stockLevel - mat.reservedLevel : 0;
        const missing = available < item.quantity ? item.quantity - available : 0;
        if (missing > 0) {
          isShortage = true;
          const note = `${mat?.name} (Thiếu ${missing} ${mat?.unit})`;
          allShortageNotes.push(note);
          
          if (mat?.category === 'BOARD') {
            isBoardShortage = true;
            boardShortageNotes.push(note);
          } else if (mat?.category === 'EDGE_BAND') {
            isEdgeShortage = true;
            edgeShortageNotes.push(note);
          }
        }
        return { ...item, material: mat, missing };
      });
      
      isShortageOut = isShortage;

      const cncStatus = isBoardShortage ? 'WAITING' : 'TODO';
      const cncWaitingReason = isBoardShortage ? `Chờ Ván: ${boardShortageNotes.join(', ')}` : null;

      const totalVan = items.filter((i:any) => i.type === 'BOARD' || i.category === 'BOARD').reduce((sum:number, i:any) => sum + i.quantity, 0);
      const totalNep = Math.ceil(items.filter((i:any) => i.type === 'EDGE_BAND' || i.category === 'EDGE_BAND').reduce((sum:number, i:any) => sum + i.quantity, 0));

      const commonProjectRef = finalProjectName || `BATCH_${batchId}`; 
      const batchTag = `BATCH_${batchName || batchId}`;
      const todayStr = new Date().toISOString().split('T')[0];

      const machines = await tx.select().from(pwrResources);
      const cncMachine = machines.find((m:any) => m.name.includes('CNC')) || machines[0];
      const edgeMachine = machines.find((m:any) => m.name.includes('Dán')) || machines[0];

      // 1. TẠO TASK MUA HÀNG (Nếu thiếu bất kỳ vật tư nào)
      let purchaseTask = null;
      if (isShortage) {
        const [pt] = await tx.insert(pwrTasks).values({
          userId,
          title: `🚨 YÊU CẦU MUA HÀNG KHẨN CẤP: Lô ${fileName}`,
          description: `Hệ thống tự động phát hiện thiếu vật tư khi nổ Task:\n${allShortageNotes.join('\n')}`,
          category: 'MATERIAL',
          priority: 'CRITICAL',
          status: 'TODO',
          projectRef: commonProjectRef,
          projectId: finalProjectId || null,
          taskType: 'PROJECT_TASK',
          tags: ['EXPLOSION', 'MUA_HANG', batchTag],
          source: 'SYSTEM_EXPLOSION'
        }).returning();
        purchaseTask = pt;
      }

      // --- SMART LEVELING ENGINE (San Phẳng Thông Minh) ---
      const todayObj = new Date();
      const startDateStr = todayObj.toISOString().split('T')[0];
      const endDateObj = new Date();
      endDateObj.setDate(endDateObj.getDate() + 90);
      const endDateStr = endDateObj.toISOString().split('T')[0];

      // Pre-fetch Tải trọng & Lịch nghỉ (Override)
      const overrides = await tx.select().from(pwrResourceCalendar)
        .where(and(gte(pwrResourceCalendar.dateStr, startDateStr), lte(pwrResourceCalendar.dateStr, endDateStr)));
      
      const existingLoads = await tx.select().from(pwrTaskResources)
        .where(and(gte(pwrTaskResources.reservedDate, startDateStr), lte(pwrTaskResources.reservedDate, endDateStr)));

      const checkCapacity = (machineId: number, dateStr: string) => {
         const machine = machines.find((m:any) => m.id === machineId);
         if (!machine) return { maxH: 8, usedH: 0, available: 8 };
         
         const override = overrides.find((o:any) => o.resourceId === machineId && o.dateStr === dateStr);
         let maxH = override ? parseFloat(override.capacityHours || '0') : parseFloat(machine.capacityHoursPerDay || '8');
         
         if (!override && Number(maxDailyHours) > 0) {
           maxH = Math.min(maxH, Number(maxDailyHours));
         }

         const usedH = existingLoads
           .filter((l:any) => l.resourceId === machineId && l.reservedDate === dateStr)
           .reduce((sum:number, l:any) => sum + parseFloat(l.estimatedHours || '0'), 0);
         
         return { maxH, usedH, available: Math.max(0, maxH - usedH) };
      };

      const generateChunks = (totalQty: number, totalHours: number, machineId: number) => {
        if (totalQty <= 0 || totalHours <= 0) return [];
        const chunks = [];
        let remQty = totalQty;
        let remH = totalHours;
        
        let d = new Date();
        let safetyCounter = 0;
        
        while (remH > 0 && safetyCounter < 100) {
          safetyCounter++;
          // Bỏ qua Chủ Nhật
          if (d.getDay() === 0) {
            d.setDate(d.getDate() + 1);
            continue;
          }

          const dateStr = d.toISOString().split('T')[0];
          const cap = checkCapacity(machineId, dateStr);

          if (cap.available > 0.1) {
            // Có thể nhét thêm vào ngày này
            const h = Math.min(cap.available, remH);
            
            // Số lượng tỷ lệ thuận, nếu là chunk cuối thì gom hết số lượng còn lại
            const isLastChunk = h === remH;
            const q = isLastChunk ? remQty : Math.round(totalQty * (h / totalHours));
            
            remH -= h;
            remQty -= q;
            
            chunks.push({ partIndex: chunks.length + 1, numChunks: 0, qty: q, hours: h, dateStr });
            
            // Lưu vào RAM cache để vòng lặp sau (hoặc task máy khác) nhìn thấy
            existingLoads.push({ resourceId: machineId, reservedDate: dateStr, estimatedHours: String(h) } as any);
          }

          if (remH > 0) {
            d.setDate(d.getDate() + 1); // Sang ngày hôm sau nếu vẫn còn giờ
          }
        }
        
        // Cập nhật lại numChunks
        chunks.forEach(c => c.numChunks = chunks.length);
        return chunks;
      };

      // ─── THUẬT TOÁN PARAMETRIC (HÌNH HỌC) + BUFFER THỰC TẾ ───
      // Hiệu suất thực tế = 70% (tức là tốn thêm ~30% thời gian do các yếu tố môi trường, máy lỗi, dọn dẹp...)
      const REALITY_FACTOR = 1.3; 
      
      let cncTotalHours = totalVan * 0.15; // fallback (Mức sàn an toàn: ~9 phút/tấm)
      if (geoStats) {
        // Tốc độ cắt 15m/p = 900m/h. Handling 10s/phôi = 0.0027h/phôi
        const cuttingTime = geoStats.totalPerimeter / 900;
        const handlingTime = geoStats.totalParts * (10 / 3600);
        const parametricTime = (cuttingTime + handlingTime) * REALITY_FACTOR;
        
        // SAFEGUARD: Nếu file Excel có Cut List bị thiếu (số dòng chi tiết quá ít so với tổng tấm BOM)
        // Dẫn đến Parametric tính ra thời gian quá thấp, ta phải giữ mức sàn Heuristic để đảm bảo thực tế.
        cncTotalHours = Math.max(parametricTime, cncTotalHours);
      }
      const cncChunks = generateChunks(totalVan, cncTotalHours, cncMachine.id);
      const cncTaskIds = [];

      for (const chunk of cncChunks) {
         const partLabel = chunk.numChunks > 1 ? ` - Phần ${chunk.partIndex}/${chunk.numChunks}` : '';
         const [cncTask] = await tx.insert(pwrTasks).values({
            userId,
            title: `[CNC] Cắt ${chunk.qty} Tấm ván - ${fileName.replace('.xlsx', '')}${partLabel}`,
            description: `Lệnh xuất từ file Ingestion.\nTổng lô: ${totalVan} Tấm. Phần này: ${chunk.qty} Tấm.\nYêu cầu quét mã vạch sau khi xong.`,
            category: 'PRODUCTION',
            priority: 'HIGH',
            status: cncStatus,
            waitingFor: cncWaitingReason,
            projectRef: commonProjectRef,
            projectId: finalProjectId || null,
            taskType: 'PROJECT_TASK',
            tags: ['EXPLOSION', 'CNC', batchTag],
            source: 'SYSTEM_EXPLOSION', startDate: chunk.dateStr, dueDate: chunk.dateStr
         }).returning();
         cncTaskIds.push(cncTask.id);

         if (purchaseTask && isBoardShortage && chunk.partIndex === 1) {
            await tx.insert(pwrTaskDependencies).values({
               taskId: cncTask.id, dependsOnId: purchaseTask.id, depType: 'PRECONDITION', timeWindowDays: 0
            });
         }

         if (cncMachine) {
            await tx.insert(pwrTaskResources).values({
               taskId: cncTask.id,
               resourceId: cncMachine.id,
               estimatedHours: chunk.hours.toFixed(2),
               reservedDate: chunk.dateStr
            });
         }
      }

      // 3. TẠO TASK DÁN CẠNH (AUTO-SPLIT)
      const isNoEdgeBanding = totalNep <= 0;
      const edgeStatus = isNoEdgeBanding ? 'DONE' : 'TODO';
      const edgeWaitingReason = (!isNoEdgeBanding && isEdgeShortage) ? `Chờ Nẹp: ${edgeShortageNotes.join(', ')}` : null;
      
      let edgeTotalHours = isNoEdgeBanding ? 0 : (totalNep / 10) * 0.1; // fallback (Mức sàn an toàn: 100m/h)
      if (!isNoEdgeBanding && geoStats) {
        // Tốc độ dán 15m/p = 900m/h. Handling 6s/cạnh
        // Ước tính số cạnh = Số lượng chi tiết * 2.5 cạnh
        const bandingTime = totalNep / 900;
        const estimatedEdges = geoStats.totalParts * 2.5; 
        const edgeHandlingTime = estimatedEdges * (6 / 3600);
        const parametricTime = (bandingTime + edgeHandlingTime) * REALITY_FACTOR;
        
        edgeTotalHours = Math.max(parametricTime, edgeTotalHours);
      }
      
      const edgeChunks = generateChunks(totalNep, edgeTotalHours, edgeMachine.id);
      const edgeTaskIds = [];

      if (isNoEdgeBanding) {
         const [edgeTask] = await tx.insert(pwrTasks).values({
            userId,
            title: `[DÁN CẠNH] Bỏ qua (Lô không có nẹp)`,
            description: `Hệ thống tự động bỏ qua vì file Excel không có mét nẹp nào.`,
            category: 'PRODUCTION', priority: 'LOW', status: 'DONE',
            projectRef: commonProjectRef, projectId: finalProjectId || null, taskType: 'PROJECT_TASK',
            tags: ['EXPLOSION', 'DAN_CANH', batchTag], source: 'SYSTEM_EXPLOSION', startDate: todayStr, dueDate: todayStr
         }).returning();
         edgeTaskIds.push(edgeTask.id);
      } else {
         for (const chunk of edgeChunks) {
            const partLabel = chunk.numChunks > 1 ? ` - Phần ${chunk.partIndex}/${chunk.numChunks}` : '';
            const [edgeTask] = await tx.insert(pwrTasks).values({
               userId,
               title: `[DÁN CẠNH] Dán ${chunk.qty} Mét nẹp - ${fileName.replace('.xlsx', '')}${partLabel}`,
               description: `Tổng lô: ${totalNep} Mét. Phần này: ${chunk.qty} Mét.`,
               category: 'PRODUCTION', priority: 'HIGH', status: edgeStatus, waitingFor: edgeWaitingReason,
               projectRef: commonProjectRef, projectId: finalProjectId || null, taskType: 'PROJECT_TASK',
               tags: ['EXPLOSION', 'DAN_CANH', batchTag, `⏰ Chờ CNC ${chunk.numChunks > 1 ? 'Phần ' + chunk.partIndex : '30p'}`],
               source: 'SYSTEM_EXPLOSION', startDate: chunk.dateStr, dueDate: chunk.dateStr
            }).returning();
            edgeTaskIds.push(edgeTask.id);

            if (edgeMachine) {
               await tx.insert(pwrTaskResources).values({
                 taskId: edgeTask.id, resourceId: edgeMachine.id, estimatedHours: chunk.hours.toFixed(2), reservedDate: chunk.dateStr
               });
            }

            // Dán cạnh phụ thuộc CNC tương ứng (nếu có)
            const correspondingCncId = cncTaskIds[Math.min(chunk.partIndex - 1, cncTaskIds.length - 1)];
            if (correspondingCncId) {
               await tx.insert(pwrTaskDependencies).values({
                 taskId: edgeTask.id, dependsOnId: correspondingCncId, depType: 'PRECONDITION', timeWindowDays: 0
               });
            }

            // Nếu thiếu nẹp, Dán cạnh 1 phụ thuộc Mua Hàng
            if (purchaseTask && isEdgeShortage && chunk.partIndex === 1) {
               await tx.insert(pwrTaskDependencies).values({
                 taskId: edgeTask.id, dependsOnId: purchaseTask.id, depType: 'PRECONDITION', timeWindowDays: 0
               });
            }
         }
      }

      // 4. TẠO TASK KHOAN CAM (AUTO-SPLIT)
      const totalPhuKien = items.filter((i: any) => i.type === 'HARDWARE' || i.category === 'HARDWARE').reduce((sum: number, i: any) => sum + i.quantity, 0);
      const estimatedPhuKien = totalPhuKien > 0 ? totalPhuKien : Math.ceil(totalVan * 6); 
      const drillMachine = machines.find((m: any) => m.name.includes('Khoan')) || machines[0];
      
      let drillTotalHours = estimatedPhuKien * 0.0133; // fallback (Mức sàn an toàn: ~75 lỗ/h)
      if (geoStats) {
        // Ván to (>0.8m2): lật ván 1.5p. Ván vừa: 0.8p. Ván nhỏ (<0.2): ko khoan
        const largeTime = (geoStats.largeParts || 0) * (1.5 / 60);
        const mediumTime = (geoStats.mediumParts || 0) * (0.8 / 60);
        const parametricTime = (largeTime + mediumTime) * REALITY_FACTOR;
        
        drillTotalHours = Math.max(parametricTime, drillTotalHours);
        if (drillTotalHours === 0 && totalVan > 0) drillTotalHours = 0.5; // tối thiểu 30p nếu có ván
      }
      
      const isNoDrilling = estimatedPhuKien <= 0 && totalVan <= 0 && drillTotalHours <= 0;
      const drillChunks = generateChunks(estimatedPhuKien, drillTotalHours, drillMachine.id);

      if (isNoDrilling) {
         await tx.insert(pwrTasks).values({
            userId, title: `[KHOAN CAM] Bỏ qua`, description: `Không có dữ liệu`,
            category: 'PRODUCTION', priority: 'LOW', status: 'DONE',
            projectRef: commonProjectRef, projectId: finalProjectId || null, taskType: 'PROJECT_TASK',
            tags: ['EXPLOSION', 'KHOAN_CAM', batchTag], source: 'SYSTEM_EXPLOSION', startDate: todayStr, dueDate: todayStr
         });
      } else {
         for (const chunk of drillChunks) {
            const partLabel = chunk.numChunks > 1 ? ` - Phần ${chunk.partIndex}/${chunk.numChunks}` : '';
            const [drillTask] = await tx.insert(pwrTasks).values({
               userId,
               title: `[KHOAN CAM] Khoan ${chunk.qty} mũi/chi tiết - ${fileName.replace('.xlsx', '')}${partLabel}`,
               description: `Tổng lô: ${estimatedPhuKien}. Phần này: ${chunk.qty}.`,
               category: 'PRODUCTION', priority: 'HIGH', status: 'TODO',
               projectRef: commonProjectRef, projectId: finalProjectId || null, taskType: 'PROJECT_TASK',
               tags: ['EXPLOSION', 'KHOAN_CAM', batchTag, `⏰ Chờ Dán Cạnh ${chunk.numChunks > 1 ? 'Phần ' + chunk.partIndex : '1h'}`],
               source: 'SYSTEM_EXPLOSION', startDate: chunk.dateStr, dueDate: chunk.dateStr
            }).returning();

            if (drillMachine) {
               await tx.insert(pwrTaskResources).values({
                 taskId: drillTask.id, resourceId: drillMachine.id, estimatedHours: chunk.hours.toFixed(2), reservedDate: chunk.dateStr
               });
            }

            // Khoan cam phụ thuộc Dán Cạnh (hoặc CNC nếu bỏ qua dán cạnh)
            let dependsOnId = null;
            if (!isNoEdgeBanding && edgeTaskIds.length > 0) {
                dependsOnId = edgeTaskIds[Math.min(chunk.partIndex - 1, edgeTaskIds.length - 1)];
            } else if (cncTaskIds.length > 0) {
                dependsOnId = cncTaskIds[Math.min(chunk.partIndex - 1, cncTaskIds.length - 1)];
            }

            if (dependsOnId) {
               await tx.insert(pwrTaskDependencies).values({
                 taskId: drillTask.id, dependsOnId, depType: 'PRECONDITION', timeWindowDays: 0
               });
            }
         }
      }

      // // 4. CẬP NHẬT KHO & TẠO PENDING TRANSACTIONS (Auto-Inventory Engine)
      for (const plan of reservationPlan) {
        // Giam lỏng tồn kho
        await tx.update(pwrMaterials)
          .set({ reservedLevel: sql`${pwrMaterials.reservedLevel} + ${plan.quantity}` })
          .where(eq(pwrMaterials.id, plan.dbMaterialId));

        // Tạo Transaction Reserve link với CNC Task
        await tx.insert(pwrMaterialTransactions).values({
          materialId: plan.dbMaterialId,
          userId: userId,
          taskId: cncTaskIds[0], // Link với CNC Phần 1
          transactionType: 'RESERVE',
          quantity: plan.quantity,
          balanceAfter: plan.material.stockLevel, 
          notes: `Giam lỏng (Reserve) cho Batch Nổ: ${batchId} - File: ${fileName}`
        });

        // Tạo Transaction PENDING_IMPORT link với Mua Hàng Task (nếu thiếu vật tư)
        if (plan.missing > 0 && purchaseTask) {
          await tx.insert(pwrMaterialTransactions).values({
            materialId: plan.dbMaterialId,
            userId: userId,
            taskId: purchaseTask.id, // Link với Mua Hàng
            transactionType: 'PENDING_IMPORT',
            quantity: plan.missing,
            balanceAfter: plan.material.stockLevel, // Chưa cộng thật
            notes: `Auto-Engine: Chờ nhập kho khi Task Mua Hàng hoàn thành`
          });
        }
      }

    });

    return NextResponse.json({ 
      success: true, 
      batchId, 
      isShortage: isShortageOut,
      stats: {
        tasksGenerated: isShortageOut ? 4 : 3,
        newMaterialsCount
      }
    });

  } catch (error: any) {
    console.error('EXPLOSION ERR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
