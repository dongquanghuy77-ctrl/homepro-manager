"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Shield, KeyRound, Lock, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pin, setPin] = useState<string[]>(Array(6).fill(""));
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // We can detect if they should change PIN by looking at user's profile or letting them choose.
  // Actually, we can automatically detect the login type from identifier or ask them to type PIN/Password.
  // To keep it simple and smart: we can show two tabs, or detect if they prefer changing PIN or Password.
  // For safety, let's offer both options in a clean tabbed layout!
  const [mode, setMode] = useState<"PASSWORD" | "PIN">("PASSWORD");

  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    let payload: any = {};

    if (mode === "PIN") {
      const pinCode = pin.join("");
      if (pinCode.length !== 6 || /\D/.test(pinCode)) {
        setError("Mã PIN mới phải gồm đúng 6 chữ số");
        return;
      }
      payload.newPin = pinCode;
    } else {
      if (!newPassword || newPassword.length < 6) {
        setError("Mật khẩu mới phải có ít nhất 6 ký tự");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Mật khẩu mới và xác nhận mật khẩu không khớp");
        return;
      }
      payload.newPassword = newPassword;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cập nhật thất bại");

      setSuccess("🎉 Cập nhật thông tin truy cập mới thành công!");
      
      // Clear cookie session and redirect to login after a short delay
      setTimeout(() => {
        // Destroy session locally on backend
        fetch("/api/auth/logout", { method: "POST" }).finally(() => {
          router.push("/login");
          router.refresh();
        });
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  }

  const handlePinChange = (value: string, index: number) => {
    const cleanVal = value.replace(/\D/g, "");
    if (!cleanVal) {
      const newPin = [...pin];
      newPin[index] = "";
      setPin(newPin);
      return;
    }
    const char = cleanVal[cleanVal.length - 1];
    const newPin = [...pin];
    newPin[index] = char;
    setPin(newPin);

    if (index < 5) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      const newPin = [...pin];
      newPin[index - 1] = "";
      setPin(newPin);
      pinRefs[index - 1].current?.focus();
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #090D16 0%, #0F172A 50%, #1E293B 100%)",
      padding: "24px 16px",
      fontFamily: '"Outfit", "Inter", sans-serif',
    }}>
      <div style={{
        width: "100%",
        maxWidth: 440,
        background: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 24,
        padding: "36px 32px",
        boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.7)",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 60,
            height: 60,
            borderRadius: 18,
            background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
            boxShadow: "0 8px 24px rgba(245, 158, 11, 0.25)",
            marginBottom: 16,
          }}>
            <KeyRound size={30} color="#fff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#F8FAFC", margin: 0, letterSpacing: "-0.025em" }}>
            Cập nhật Mã Truy Cập
          </h1>
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 6, lineHeight: "1.4" }}>
            Tài khoản của bạn đã được HR đặt lại. Để đảm bảo an toàn, vui lòng thiết lập Mật khẩu hoặc mã PIN mới trước khi tiếp tục.
          </p>
        </div>

        {/* Tab Selector */}
        <div style={{
          display: "flex",
          background: "rgba(0, 0, 0, 0.2)",
          padding: 4,
          borderRadius: 10,
          border: "1px solid rgba(255, 255, 255, 0.05)",
          marginBottom: 24,
        }}>
          <button
            type="button"
            onClick={() => setMode("PASSWORD")}
            style={{
              flex: 1,
              padding: "8px",
              background: mode === "PASSWORD" ? "rgba(255, 255, 255, 0.08)" : "transparent",
              border: "none",
              borderRadius: 8,
              color: mode === "PASSWORD" ? "#F8FAFC" : "#64748B",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🔒 Tạo Mật Khẩu Mới
          </button>
          <button
            type="button"
            onClick={() => setMode("PIN")}
            style={{
              flex: 1,
              padding: "8px",
              background: mode === "PIN" ? "rgba(255, 255, 255, 0.08)" : "transparent",
              border: "none",
              borderRadius: 8,
              color: mode === "PIN" ? "#F8FAFC" : "#64748B",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            📱 Tạo mã PIN Mới
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 14px",
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: 12,
            color: "#FCA5A5",
            fontSize: 13,
            marginBottom: 20,
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 14px",
            background: "rgba(16, 185, 129, 0.12)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            borderRadius: 12,
            color: "#A7F3D0",
            fontSize: 13,
            marginBottom: 20,
          }}>
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}

        {/* Main form */}
        <form onSubmit={handleSubmit}>
          {mode === "PASSWORD" ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94A3B8", marginBottom: 6 }}>
                  Mật khẩu mới (Tối thiểu 6 ký tự)
                </label>
                <div style={{ position: "relative" }}>
                  <Lock size={16} style={{ position: "absolute", left: 12, top: 12, color: "#64748B" }} />
                  <input
                    type={showPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    style={{
                      width: "100%",
                      padding: "10px 12px 10px 38px",
                      background: "#0F172A",
                      border: "1px solid #334155",
                      borderRadius: 10,
                      color: "#F8FAFC",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94A3B8", marginBottom: 6 }}>
                  Xác nhận mật khẩu mới
                </label>
                <div style={{ position: "relative" }}>
                  <Lock size={16} style={{ position: "absolute", left: 12, top: 12, color: "#64748B" }} />
                  <input
                    type={showPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    style={{
                      width: "100%",
                      padding: "10px 12px 10px 38px",
                      background: "#0F172A",
                      border: "1px solid #334155",
                      borderRadius: 10,
                      color: "#F8FAFC",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: 11,
                      background: "transparent",
                      border: "none",
                      color: "#64748B",
                      cursor: "pointer",
                      padding: 2,
                    }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3B82F6", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Nhập mã PIN mới (6 chữ số)
              </label>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={pinRefs[index]}
                    type="text"
                    maxLength={1}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handlePinChange(e.target.value, index)}
                    onKeyDown={(e) => handlePinKeyDown(e, index)}
                    style={{
                      width: "46px",
                      height: "48px",
                      background: "rgba(15, 23, 42, 0.7)",
                      border: digit ? "2px solid #F59E0B" : "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: 10,
                      color: "#F8FAFC",
                      fontSize: 20,
                      fontWeight: "700",
                      textAlign: "center",
                      outline: "none",
                      transition: "all 0.15s ease",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(245, 158, 11, 0.25)",
            }}
          >
            {loading ? "Đang xử lý..." : "Cập nhật & Đăng nhập lại"}
          </button>
        </form>
      </div>
    </div>
  );
}