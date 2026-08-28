import re

with open("src/components/pwr/ingestion/PwrIngestionClient.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace handleExecute
new_execute = """
  const handleExecute = async () => {
    if (!parsedData || parsedData.totalMissing > 0) return;
    setIsUploading(true);
    try {
      const batchId = Date.now().toString();
      const res = await fetch('/api/pwr/ingestion/explode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: parsedData.fileName,
          items: parsedData.items,
          batchId: batchId
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      if (result.isShortage) {
        alert(`⚠️ Tồn kho không đủ! Đã chuyển Task sang chế độ [Chờ Vật Tư] và tạo tự động Yêu cầu mua hàng.\\nMã Lô: ${batchId}`);
      } else {
        alert(`🚀 ĐÃ NỔ TASK THÀNH CÔNG!\\nVật tư đã được giam lỏng. Task CNC và Dán Cạnh đã được đưa vào màn hình Kanban.\\nMã Lô: ${batchId}`);
      }
      router.push('/pwr/tasks');
    } catch (err: any) {
      alert("Lỗi Nổ Task: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };
"""

content = re.sub(r'const handleExecute = async \(\) => \{[\s\S]*?router\.push\(\'/pwr/tasks\'\);\s*\};', new_execute.strip(), content)

with open("src/components/pwr/ingestion/PwrIngestionClient.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched Ingestion Client")