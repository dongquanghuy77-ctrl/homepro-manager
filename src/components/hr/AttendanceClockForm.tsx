'use client';
// src/components/hr/AttendanceClockForm.tsx
// ══════════════════════════════════════════════════════════════════════════════
// Component: Chấm công 2 bước qua điện thoại
//   Bước 1 — Geofencing: Xác minh nhân viên đang ở trong xưởng (≤ 50m)
//   Bước 2 — Face Capture: Chụp ảnh khuôn mặt để xác nhận danh tính
//
// State Machine:
//   INIT → GPS_REQUESTING → GPS_DENIED | GPS_OUTSIDE | GPS_INSIDE
//   GPS_INSIDE → CAMERA_REQUESTING → CAMERA_DENIED | CAMERA_READY
//   CAMERA_READY → CAPTURING (countdown 3s) → PREVIEWING → SUBMITTING → SUCCESS/ERROR
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin, Camera, CheckCircle, XCircle, AlertTriangle,
  RefreshCw, Loader2, Shield, ZoomIn, ChevronRight
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Tọa độ trung tâm xưởng HomePro */
const FACTORY_CENTER = { lat: 10.762622, lng: 106.660172 };

/** Bán kính vùng chấm công (mét) */
const GEOFENCE_RADIUS_M = 50;

/** Đếm ngược trước khi chụp (giây) */
const CAPTURE_COUNTDOWN_SEC = 3;

/** Chất lượng ảnh JPEG (0-1) */
const PHOTO_QUALITY = 0.80;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AppState =
  | 'INIT'
  | 'GPS_REQUESTING'
  | 'GPS_DENIED'
  | 'GPS_OUTSIDE'
  | 'GPS_INSIDE'
  | 'CAMERA_REQUESTING'
  | 'CAMERA_DENIED'
  | 'CAMERA_READY'
  | 'CAPTURING'
  | 'PREVIEWING'
  | 'SUBMITTING'
  | 'SUCCESS'
  | 'ERROR';

interface GpsData {
  lat:      number;
  lng:      number;
  accuracy: number;  // mét
  distance: number;  // khoảng cách đến xưởng (mét)
}

interface Props {
  action:        'CLOCK_IN' | 'CLOCK_OUT';
  employeeName?: string;
  onSuccess?:    (result: unknown) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Haversine Formula — Tính khoảng cách 2 tọa độ GPS (mét)
//
// Công thức chuẩn thiên văn học, chính xác ±0.5% với khoảng cách nhỏ (< 1km)
// Không dùng phép tính đơn giản Euclidean vì Trái Đất là hình cầu.
// ─────────────────────────────────────────────────────────────────────────────
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R  = 6_371_000;                       // Bán kính Trái Đất (mét)
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function AttendanceClockForm({ action, employeeName, onSuccess }: Props) {
  const [state,     setState]     = useState<AppState>('INIT');
  const [gpsData,   setGpsData]   = useState<GpsData | null>(null);
  const [countdown, setCountdown] = useState(CAPTURE_COUNTDOWN_SEC);
  const [photoB64,  setPhotoB64]  = useState<string | null>(null);
  const [errorMsg,  setErrorMsg]  = useState<string>('');
  const [deniedType, setDeniedType] = useState<'GPS' | 'CAMERA' | null>(null);

  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const timerRef   = useRef<NodeJS.Timeout | null>(null);

  // ── Cleanup camera stream khi unmount ───────────────────────────────────────
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // BƯỚC 1: Geofencing — Xin GPS + tính khoảng cách
  // ═══════════════════════════════════════════════════════════════════════════
  const requestGps = useCallback(() => {
    setState('GPS_REQUESTING');
    setGpsData(null);
    setDeniedType(null);

    if (!navigator.geolocation) {
      setErrorMsg('Thiết bị không hỗ trợ GPS. Vui lòng dùng trình duyệt Chrome/Safari mới nhất.');
      setState('ERROR');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      // ── Thành công ──────────────────────────────────────────────────────
      (position) => {
        const { latitude: lat, longitude: lng, accuracy } = position.coords;
        const distance = haversineDistance(lat, lng, FACTORY_CENTER.lat, FACTORY_CENTER.lng);

        const data: GpsData = { lat, lng, accuracy: Math.round(accuracy), distance: Math.round(distance) };
        setGpsData(data);

        if (distance <= GEOFENCE_RADIUS_M) {
          setState('GPS_INSIDE');
        } else {
          setState('GPS_OUTSIDE');
        }
      },

      // ── Lỗi GPS ─────────────────────────────────────────────────────────
      (err) => {
        if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
          // Người dùng bấm "Từ chối" → hiển thị hướng dẫn mở lại
          setDeniedType('GPS');
          setState('GPS_DENIED');
        } else if (err.code === GeolocationPositionError.POSITION_UNAVAILABLE) {
          setErrorMsg('Không xác định được vị trí. Hãy di chuyển ra nơi thông thoáng.');
          setState('ERROR');
        } else if (err.code === GeolocationPositionError.TIMEOUT) {
          setErrorMsg('Hết thời gian chờ GPS. Vui lòng thử lại.');
          setState('ERROR');
        } else {
          setErrorMsg(`Lỗi GPS: ${err.message}`);
          setState('ERROR');
        }
      },

      // ── Options ──────────────────────────────────────────────────────────
      {
        enableHighAccuracy: true,   // Dùng GPS thực (không phải WiFi location)
        timeout:            15_000, // 15 giây timeout
        maximumAge:         10_000, // Chấp nhận vị trí cũ tối đa 10 giây
      }
    );
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // BƯỚC 2A: Mở Camera trước
  // ═══════════════════════════════════════════════════════════════════════════
  const requestCamera = useCallback(async () => {
    setState('CAMERA_REQUESTING');
    setDeniedType(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode:  'user',  // Camera trước
          width:  { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      streamRef.current = stream;

      // Gắn stream vào thẻ <video>
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      setState('CAMERA_READY');

    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        // Người dùng bấm "Từ chối" camera
        setDeniedType('CAMERA');
        setState('CAMERA_DENIED');
      } else if (name === 'NotFoundError') {
        setErrorMsg('Không tìm thấy camera trên thiết bị này.');
        setState('ERROR');
      } else if (name === 'NotReadableError') {
        setErrorMsg('Camera đang được dùng bởi ứng dụng khác. Hãy đóng và thử lại.');
        setState('ERROR');
      } else {
        setErrorMsg(`Không thể mở camera: ${name}`);
        setState('ERROR');
      }
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // BƯỚC 2B: Đếm ngược + Chụp ảnh
  // ═══════════════════════════════════════════════════════════════════════════
  const startCapture = useCallback(() => {
    setState('CAPTURING');
    setCountdown(CAPTURE_COUNTDOWN_SEC);

    let remaining = CAPTURE_COUNTDOWN_SEC;

    timerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        // Chụp frame từ video sang canvas → Base64
        const video  = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        canvas.width  = video.videoWidth  || 640;
        canvas.height = video.videoHeight || 640;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Mirror (flip ngang) vì camera trước thường bị ngược
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);

        const base64 = canvas.toDataURL('image/jpeg', PHOTO_QUALITY);
        setPhotoB64(base64);

        // Dừng camera sau khi chụp (tiết kiệm pin + không chiếm camera nữa)
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;

        setState('PREVIEWING');
      }
    }, 1000);
  }, []);

  // ── Chụp lại ──────────────────────────────────────────────────────────────
  const retake = useCallback(() => {
    setPhotoB64(null);
    requestCamera();
  }, [requestCamera]);

  // ═══════════════════════════════════════════════════════════════════════════
  // BƯỚC 3: Submit lên API
  // ═══════════════════════════════════════════════════════════════════════════
  const submitClock = useCallback(async () => {
    if (!gpsData || !photoB64) return;
    setState('SUBMITTING');

    try {
      const res = await fetch('/api/hr/attendance/clock', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          sourceType: 'WEB_GPS',
          lat:        gpsData.lat,
          lng:        gpsData.lng,
          photoBase64: photoB64, // API hiện chưa lưu ảnh — field cho tương lai
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || `Lỗi ${res.status}`);
        setState('ERROR');
        return;
      }

      setState('SUCCESS');
      onSuccess?.(data);

    } catch (err) {
      setErrorMsg('Mất kết nối mạng. Vui lòng thử lại.');
      setState('ERROR');
    }
  }, [gpsData, photoB64, action, onSuccess]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const actionLabel = action === 'CLOCK_IN' ? 'Chấm công vào' : 'Chấm công ra';
  const actionColor = action === 'CLOCK_IN' ? '#10B981' : '#F59E0B';

  return (
    <div style={{
      maxWidth: 400, margin: '0 auto', padding: '24px 16px',
      display: 'flex', flexDirection: 'column', gap: 24, minHeight: '80vh',
    }}>

      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: `${actionColor}20`, border: `2px solid ${actionColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
        }}>
          <Shield size={24} style={{ color: actionColor }} />
        </div>
        <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 4 }}>{actionLabel}</h2>
        {employeeName && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>{employeeName}</p>
        )}

        {/* Progress Stepper */}
        <StepIndicator state={state} />
      </div>

      {/* ── INIT ── */}
      {state === 'INIT' && (
        <Panel icon="📍" title="Bước 1: Xác minh vị trí" color="#2563EB">
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16 }}>
            Hệ thống sẽ kiểm tra bạn đang ở trong vùng cho phép chấm công
            (bán kính <strong>{GEOFENCE_RADIUS_M}m</strong> từ trung tâm xưởng).
          </p>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={requestGps}>
            <MapPin size={16} /> Bật GPS và kiểm tra vị trí
          </button>
        </Panel>
      )}

      {/* ── GPS REQUESTING ── */}
      {state === 'GPS_REQUESTING' && (
        <Panel icon="📡" title="Đang xác định vị trí..." color="#2563EB">
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <RadarAnimation />
            <p style={{ marginTop: 16, color: 'var(--color-text-muted)', fontSize: 13 }}>
              Vui lòng bấm <strong>"Cho phép"</strong> khi trình duyệt hỏi xin vị trí
            </p>
          </div>
        </Panel>
      )}

      {/* ── GPS DENIED ── */}
      {state === 'GPS_DENIED' && (
        <PermissionDeniedCard
          type="GPS"
          onRetry={requestGps}
        />
      )}

      {/* ── GPS OUTSIDE ── */}
      {state === 'GPS_OUTSIDE' && gpsData && (
        <Panel icon="🚫" title="Ngoài vùng chấm công" color="#EF4444">
          <DistanceMeter
            distance={gpsData.distance}
            radius={GEOFENCE_RADIUS_M}
            accuracy={gpsData.accuracy}
          />
          <div style={{
            background: '#EF444415', border: '1px solid #EF444430',
            borderRadius: 10, padding: '12px 16px', marginTop: 16,
            fontSize: 13, color: '#EF4444',
          }}>
            Bạn đang cách xưởng <strong>{gpsData.distance}m</strong>.
            Cần vào trong vòng <strong>{GEOFENCE_RADIUS_M}m</strong> để chấm công.
          </div>
          <button
            className="btn btn-secondary" style={{ width: '100%', marginTop: 12 }}
            onClick={requestGps}
          >
            <RefreshCw size={14} /> Kiểm tra lại vị trí
          </button>
        </Panel>
      )}

      {/* ── GPS INSIDE → Mời bước 2 ── */}
      {state === 'GPS_INSIDE' && gpsData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Panel icon="✅" title="Xác minh vị trí thành công" color="#10B981">
            <DistanceMeter
              distance={gpsData.distance}
              radius={GEOFENCE_RADIUS_M}
              accuracy={gpsData.accuracy}
            />
          </Panel>
          <Panel icon="📷" title="Bước 2: Chụp ảnh xác nhận" color="#2563EB">
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16 }}>
              Hệ thống sẽ chụp ảnh khuôn mặt để xác nhận danh tính.
              Hãy nhìn thẳng vào camera.
            </p>
            <button
              className="btn btn-primary" style={{ width: '100%' }}
              onClick={requestCamera}
            >
              <Camera size={16} /> Mở Camera
            </button>
          </Panel>
        </div>
      )}

      {/* ── CAMERA REQUESTING ── */}
      {state === 'CAMERA_REQUESTING' && (
        <Panel icon="📷" title="Đang khởi động camera..." color="#2563EB">
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#2563EB' }} />
            <p style={{ marginTop: 16, color: 'var(--color-text-muted)', fontSize: 13 }}>
              Vui lòng bấm <strong>"Cho phép"</strong> khi trình duyệt hỏi xin camera
            </p>
          </div>
        </Panel>
      )}

      {/* ── CAMERA DENIED ── */}
      {state === 'CAMERA_DENIED' && (
        <PermissionDeniedCard
          type="CAMERA"
          onRetry={requestCamera}
        />
      )}

      {/* ── CAMERA READY + CAPTURING ── */}
      {(state === 'CAMERA_READY' || state === 'CAPTURING') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center' }}>
            Nhìn thẳng vào camera — giữ mặt trong khung hình
          </p>

          {/* Khung oval camera */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 280, height: 320,
              borderRadius: '50% / 45%',  // Oval (rộng hơn cao hơn)
              overflow: 'hidden',
              border: `4px solid ${state === 'CAPTURING' ? '#EF4444' : '#2563EB'}`,
              boxShadow: `0 0 0 6px ${state === 'CAPTURING' ? '#EF444420' : '#2563EB20'}`,
              position: 'relative',
              background: '#000',
              transition: 'border-color 0.3s, box-shadow 0.3s',
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',  // Mirror: tự nhiên hơn cho camera trước
                }}
              />

              {/* Overlay đếm ngược */}
              {state === 'CAPTURING' && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,0,0,0.45)',
                }}>
                  <span style={{
                    fontSize: 96, fontWeight: 900, color: '#fff',
                    textShadow: '0 0 20px rgba(255,255,255,0.5)',
                    animation: 'countPulse 1s ease-in-out infinite',
                    lineHeight: 1,
                  }}>
                    {countdown}
                  </span>
                </div>
              )}
            </div>

            {/* Hướng dẫn khuôn mặt — đường oval phụ */}
            <div style={{
              position: 'absolute', inset: -6, borderRadius: '50% / 45%',
              border: '1px dashed rgba(37,99,235,0.4)',
              pointerEvents: 'none',
            }} />
          </div>

          {/* Canvas ẩn để chụp ảnh */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {state === 'CAMERA_READY' && (
            <button
              className="btn btn-primary"
              style={{ width: '100%', maxWidth: 280 }}
              onClick={startCapture}
            >
              <Camera size={16} /> Chụp ảnh ({CAPTURE_COUNTDOWN_SEC}s)
            </button>
          )}

          {state === 'CAPTURING' && (
            <button className="btn btn-secondary" style={{ width: '100%', maxWidth: 280 }} disabled>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              Đang chụp...
            </button>
          )}
        </div>
      )}

      {/* ── PREVIEWING ── */}
      {state === 'PREVIEWING' && photoB64 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center' }}>
            Xem lại ảnh chụp — ảnh rõ khuôn mặt chưa?
          </p>

          <div style={{
            width: 280, height: 320, borderRadius: '50% / 45%',
            overflow: 'hidden',
            border: '4px solid #10B981',
            boxShadow: '0 0 0 6px #10B98120',
            position: 'relative',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoB64} alt="Ảnh chụp" style={{
              width: '100%', height: '100%', objectFit: 'cover',
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              paddingBottom: 16, background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.4))',
            }}>
              <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>
                ✅ Ảnh đã chụp
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 280 }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={retake}
            >
              <RefreshCw size={14} /> Chụp lại
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 2, background: actionColor, borderColor: actionColor }}
              onClick={submitClock}
            >
              <ChevronRight size={14} /> Xác nhận
            </button>
          </div>
        </div>
      )}

      {/* ── SUBMITTING ── */}
      {state === 'SUBMITTING' && (
        <Panel icon="⏳" title="Đang ghi nhận..." color="#F59E0B">
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#F59E0B' }} />
            <p style={{ marginTop: 16, color: 'var(--color-text-muted)', fontSize: 13 }}>
              Đang gửi dữ liệu chấm công lên hệ thống...
            </p>
          </div>
        </Panel>
      )}

      {/* ── SUCCESS ── */}
      {state === 'SUCCESS' && gpsData && (
        <div style={{ textAlign: 'center', animation: 'fadeInUp 0.5s ease' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: '#10B98120', border: '3px solid #10B981',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            animation: 'successPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}>
            <CheckCircle size={40} style={{ color: '#10B981' }} />
          </div>
          <h3 style={{ fontWeight: 800, fontSize: 20, color: '#10B981', marginBottom: 8 }}>
            {actionLabel} thành công!
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 16 }}>
            {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <div style={{
            background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)',
            borderRadius: 10, padding: '12px 16px', fontSize: 12,
            color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between',
          }}>
            <span>📍 {gpsData.distance}m từ xưởng</span>
            <span>🎯 ±{gpsData.accuracy}m</span>
          </div>
        </div>
      )}

      {/* ── ERROR ── */}
      {state === 'ERROR' && (
        <Panel icon="❌" title="Có lỗi xảy ra" color="#EF4444">
          <p style={{ fontSize: 14, color: '#EF4444', marginBottom: 16 }}>{errorMsg}</p>
          <button className="btn btn-secondary" style={{ width: '100%' }}
            onClick={() => { setErrorMsg(''); setState('INIT'); }}>
            <RefreshCw size={14} /> Thử lại từ đầu
          </button>
        </Panel>
      )}

      <style>{`
        @keyframes spin         { to { transform: rotate(360deg); } }
        @keyframes radarSweep   { to { transform: rotate(360deg); opacity: 0; } }
        @keyframes radarPulse   { 0%,100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.15); opacity: 0.2; } }
        @keyframes countPulse   { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        @keyframes successPop   { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes fadeInUp     { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: StepIndicator
// ─────────────────────────────────────────────────────────────────────────────
function StepIndicator({ state }: { state: AppState }) {
  const step1Done = ['GPS_INSIDE', 'CAMERA_REQUESTING', 'CAMERA_DENIED',
                     'CAMERA_READY', 'CAPTURING', 'PREVIEWING', 'SUBMITTING', 'SUCCESS'].includes(state);
  const step2Done = ['SUCCESS'].includes(state);
  const step1Active = ['GPS_REQUESTING', 'GPS_DENIED', 'GPS_OUTSIDE', 'GPS_INSIDE'].includes(state);
  const step2Active = ['CAMERA_REQUESTING', 'CAMERA_DENIED', 'CAMERA_READY',
                       'CAPTURING', 'PREVIEWING', 'SUBMITTING'].includes(state);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
      <StepDot label="GPS" done={step1Done} active={step1Active} num={1} />
      <div style={{ width: 40, height: 2, background: step1Done ? '#10B981' : 'var(--color-border)',
                    borderRadius: 1, transition: 'background 0.4s' }} />
      <StepDot label="Camera" done={step2Done} active={step2Active} num={2} />
    </div>
  );
}

function StepDot({ label, done, active, num }: {
  label: string; done: boolean; active: boolean; num: number;
}) {
  const bg = done ? '#10B981' : active ? '#2563EB' : 'var(--color-surface-raised)';
  const color = (done || active) ? '#fff' : 'var(--color-text-muted)';
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', background: bg, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, margin: '0 auto 4px',
        border: `2px solid ${done ? '#10B981' : active ? '#2563EB' : 'var(--color-border)'}`,
        transition: 'all 0.3s',
      }}>
        {done ? '✓' : num}
      </div>
      <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Panel
// ─────────────────────────────────────────────────────────────────────────────
function Panel({ icon, title, color, children }: {
  icon: string; title: string; color: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: `1px solid var(--color-border)`,
      borderRadius: 14,
      padding: '20px',
      animation: 'fadeInUp 0.3s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <h3 style={{ fontWeight: 700, fontSize: 15, color }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: DistanceMeter — Visualize khoảng cách
// ─────────────────────────────────────────────────────────────────────────────
function DistanceMeter({ distance, radius, accuracy }: {
  distance: number; radius: number; accuracy: number;
}) {
  const pct     = Math.min(1, distance / (radius * 2));  // 0=center, 1=edge×2
  const isInside = distance <= radius;
  const color   = isInside ? '#10B981' : '#EF4444';

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Visual map ring */}
      <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 12px' }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          {/* Vùng an toàn */}
          <circle cx="50" cy="50" r="30" fill={`${color}15`} stroke={color} strokeWidth="1.5"
                  strokeDasharray="4 2" />
          {/* Trung tâm xưởng */}
          <circle cx="50" cy="50" r="5" fill={color} />
          <text x="50" y="80" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.6">Xưởng</text>
          {/* Vị trí NV */}
          {isInside && (
            <circle cx={50 + (pct * 25)} cy={50 - (pct * 10)} r="6"
                    fill="#2563EB" stroke="#fff" strokeWidth="2" />
          )}
        </svg>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: 13 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 22, color }}>{distance}m</div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Khoảng cách</div>
        </div>
        <div style={{ width: 1, background: 'var(--color-border)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 22, color: '#6B7280' }}>{accuracy}m</div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Độ chính xác GPS</div>
        </div>
        <div style={{ width: 1, background: 'var(--color-border)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 22, color }}>
            {isInside ? '✅' : '🚫'}
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
            {isInside ? 'Trong vùng' : 'Ngoài vùng'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: RadarAnimation
// ─────────────────────────────────────────────────────────────────────────────
function RadarAnimation() {
  return (
    <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto' }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          position: 'absolute', inset: `${i * 12}px`,
          borderRadius: '50%', border: '2px solid #2563EB',
          animation: `radarPulse 1.5s ease-in-out ${i * 0.5}s infinite`,
        }} />
      ))}
      <div style={{
        position: 'absolute', inset: '28px',
        borderRadius: '50%', background: '#2563EB',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <MapPin size={14} style={{ color: '#fff' }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: PermissionDeniedCard
// Self-review coverage: Hướng dẫn khi người dùng từ chối GPS hoặc Camera
// ─────────────────────────────────────────────────────────────────────────────
function PermissionDeniedCard({ type, onRetry }: {
  type: 'GPS' | 'CAMERA';
  onRetry: () => void;
}) {
  const isGps = type === 'GPS';
  const icon  = isGps ? '📍' : '📷';
  const label = isGps ? 'Vị trí (GPS)' : 'Camera';

  const steps = isGps
    ? [
        { icon: '1️⃣', text: 'Nhìn lên thanh địa chỉ trình duyệt' },
        { icon: '🔒', text: 'Bấm vào biểu tượng 🔒 hoặc ⓘ bên trái URL' },
        { icon: '📍', text: 'Tìm dòng "Vị trí" → Chọn "Cho phép"' },
        { icon: '🔄', text: 'Tải lại trang hoặc bấm "Thử lại" bên dưới' },
      ]
    : [
        { icon: '1️⃣', text: 'Nhìn lên thanh địa chỉ trình duyệt' },
        { icon: '🔒', text: 'Bấm vào biểu tượng 🔒 hoặc ⓘ bên trái URL' },
        { icon: '📷', text: 'Tìm dòng "Camera" → Chọn "Cho phép"' },
        { icon: '🔄', text: 'Tải lại trang hoặc bấm "Thử lại" bên dưới' },
      ];

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid #EF444440',
      borderRadius: 14,
      padding: 20,
      animation: 'fadeInUp 0.3s ease',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        paddingBottom: 14, borderBottom: '1px solid var(--color-border)', marginBottom: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: '#EF444415', border: '2px solid #EF444440',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontWeight: 700, color: '#EF4444', fontSize: 15 }}>
            Quyền {label} bị từ chối
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            Cần cấp quyền để chấm công
          </div>
        </div>
      </div>

      {/* Hướng dẫn từng bước */}
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)',
                  marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Cách mở lại quyền:
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {steps.map((step, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: 'var(--color-surface-raised)',
            borderRadius: 8, padding: '8px 12px',
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{step.icon}</span>
            <span style={{ fontSize: 13 }}>{step.text}</span>
          </div>
        ))}
      </div>

      {/* Ghi chú iOS Safari */}
      <div style={{
        background: '#F59E0B10', border: '1px solid #F59E0B30',
        borderRadius: 8, padding: '8px 12px', marginBottom: 16,
        fontSize: 12, color: '#F59E0B',
        display: 'flex', gap: 6, alignItems: 'flex-start',
      }}>
        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          <strong>iPhone/Safari:</strong> Vào <em>Cài đặt → Safari → {label}</em> → Chọn "Hỏi" hoặc "Cho phép"
        </span>
      </div>

      {/* Nút Thử lại */}
      <button
        className="btn btn-primary"
        style={{ width: '100%' }}
        onClick={onRetry}
      >
        <RefreshCw size={14} /> Thử lại
      </button>
    </div>
  );
}
