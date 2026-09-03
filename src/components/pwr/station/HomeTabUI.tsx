import React, { useEffect, useState } from "react";
import { LogOut, Sun, Coffee, CheckCircle2, TrendingUp, Bell } from "lucide-react";
import { usePwrStore } from "@/lib/pwr/usePwrStore";

export function HomeTabUI({ userName }: { userName: string }) {
  const { logout } = usePwrStore();
  const [data, setData] = useState<any>(null);
  const [pushStatus, setPushStatus] = useState<"IDLE"|"SUBSCRIBED"|"UNSUPPORTED">("IDLE");

  useEffect(() => {
    fetch("/api/pwr/dashboard").then(r => r.json()).then(d => setData(d));
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          if (sub) setPushStatus("SUBSCRIBED");
        });
      });
    } else {
      setPushStatus("UNSUPPORTED");
    }
  }, []);

  const subscribePush = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_KEY
      });
      await fetch("/api/pwr/station/push-subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub })
      });
      setPushStatus("SUBSCRIBED");
      alert("Đã bật thông báo thành công!");
    } catch (e) {
      alert("Không thể bật thông báo. Vui lòng cấp quyền trên trình duyệt.");
    }
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 11) return { text: "Chào buổi sáng", icon: <Sun size={18} color="#fbbf24" /> };
    if (hr < 14) return { text: "Nghỉ trưa thôi", icon: <Coffee size={18} color="#d97706" /> };
    if (hr < 18) return { text: "Chào buổi chiều", icon: <Sun size={18} color="#f59e0b" /> };
    return { text: "Chào buổi tối", icon: <Sun size={18} color="#9ca3af" /> };
  };
  const greeting = getGreeting();

  const total = data?.stats?.total || 0;
  const done = data?.stats?.doneToday || 0;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div style={{ padding: "0 20px 100px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#9ca3af", fontSize: 13, marginBottom: 4 }}>
            {greeting.icon} {greeting.text},
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{userName}</h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {pushStatus === "IDLE" && (
            <button onClick={subscribePush} style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Bell size={18} />
            </button>
          )}
          <button onClick={logout} style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(239,68,68,0.1)", border: "none", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 24, marginBottom: 24, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "relative", zIndex: 1 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 15, color: "#9ca3af", display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={16} /> Tiến độ hôm nay
          </h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, color: "#10b981" }}>{done}</span>
            <span style={{ fontSize: 16, color: "#6b7280", paddingBottom: 4 }}>/ {total} task</span>
          </div>
          
          <div style={{ background: "rgba(255,255,255,0.05)", height: 8, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(90deg, #34d399, #10b981)", width: `${pct}%`, height: "100%", borderRadius: 4, transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
            <span>0%</span>
            <span>{pct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
