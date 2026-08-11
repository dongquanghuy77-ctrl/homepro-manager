'use client';

// src/components/worker/PwaInstallPrompt.tsx
// Component Bottom Sheet huong dan cai dat PWA cho ca Android va iOS

import { useState, useEffect } from 'react';
import { Share, PlusSquare, Smartphone, Download, X } from 'lucide-react';

interface PwaInstallPromptProps {
  deferredPrompt: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function PwaInstallPrompt({ deferredPrompt, isOpen, onClose }: PwaInstallPromptProps) {
  const [isIosDevice, setIsIosDevice] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      const ios = /iphone|ipad|ipod/.test(ua);
      setIsIosDevice(ios);
    }
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA installation outcome: ${outcome}`);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#1E293B',
      borderTop: '2px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '20px 20px 0 0',
      padding: '24px 20px 32px 20px',
      zIndex: 10000,
      boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.5)',
      fontFamily: '"Outfit", "Inter", sans-serif',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(59, 130, 246, 0.1)',
            color: '#3B82F6',
          }}>
            <Smartphone size={18} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
            Cài đặt ứng dụng HomePro
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            borderRadius: '50%',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94A3B8',
            cursor: 'pointer',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <p style={{ fontSize: 13, color: '#CBD5E1', lineHeight: '1.5', marginBottom: 20 }}>
        Cài đặt ứng dụng ra Màn hình chính giúp bạn truy cập nhanh chỉ bằng 1 chạm và sử dụng chức năng chấm công ngoại tuyến (Offline) ngay cả khi mất mạng.
      </p>

      {isIosDevice ? (
        // iOS Safari Instructions
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: 12,
          padding: 16,
          fontSize: 13,
          color: '#E2E8F0',
          lineHeight: '1.6',
        }}>
          <div style={{ fontWeight: 600, color: '#3B82F6', marginBottom: 8 }}>Hướng dẫn cài đặt trên iPhone:</div>
          <ol style={{ paddingLeft: 18, margin: 0 }}>
            <li style={{ marginBottom: 6 }}>
              Bấm vào biểu tượng <strong>Chia sẻ (Share)</strong> <Share size={15} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px', color: '#3B82F6' }} /> ở thanh dưới của trình duyệt Safari.
            </li>
            <li>
              Cuộn xuống dưới và chọn mục <strong>Thêm vào MH chính (Add to Home Screen)</strong> <PlusSquare size={15} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px', color: '#F8FAFC' }} />.
            </li>
          </ol>
        </div>
      ) : deferredPrompt ? (
        // Android / Chrome Native Prompt Button
        <button
          onClick={handleInstallClick}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 10,
            background: '#2563EB',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Download size={16} /> Cài đặt ngay
        </button>
      ) : (
        // Desktop or other browsers (Safari desktop, Firefox Android)
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: 12,
          padding: 12,
          fontSize: 12,
          color: '#94A3B8',
          textAlign: 'center',
        }}>
          💡 Hãy mở menu trình duyệt và chọn <strong>"Cài đặt ứng dụng"</strong> hoặc <strong>"Thêm vào Màn hình chính"</strong> để trải nghiệm tốt nhất.
        </div>
      )}
    </div>
  );
}
