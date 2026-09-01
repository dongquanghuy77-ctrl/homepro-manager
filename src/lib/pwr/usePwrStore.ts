import { create } from 'zustand';

export type TabType = 'HOME' | 'LEADERBOARD' | 'STATION' | 'REPORTS' | 'PROFILE';
export type StationType = 'CNC' | 'DAN_CANH' | 'KHOAN_CAM' | null;

interface PwrState {
  currentTab: TabType;
  activeStation: StationType;
  // Gamification & Profile
  userName: string;
  userAvatar: string;
  userPoints: number;
  userLevel: number;
  
  setTab: (tab: TabType) => void;
  setActiveStation: (station: StationType) => void;
  addPoints: (points: number) => void;
}

export const usePwrStore = create<PwrState>((set) => ({
  currentTab: 'STATION',
  activeStation: null,
  userName: 'Anh Huy',
  userAvatar: 'https://cdn-error-link.com/avatar.jpg', // Cố tình để link lỗi để test thuật toán fallback
  userPoints: 120,
  userLevel: 12,

  setTab: (tab) => set({ currentTab: tab }),
  setActiveStation: (station) => set({ activeStation: station }),
  
  // Thuật toán: Tự động cộng điểm và tính lại Level (Level = Floor(Sqrt(Points/100)) + 1)
  addPoints: async (pointsToAdd) => {
    // 1. Snapshot điểm hiện tại (Optimistic Rollback Target)
    const currentPoints = usePwrStore.getState().userPoints;
    const currentLevel = usePwrStore.getState().userLevel;

    // 2. Optimistic Update UI ngay lập tức
    const newPoints = currentPoints + pointsToAdd;
    const newLevel = Math.floor(Math.sqrt(newPoints / 100)) + 1;
    set({ userPoints: newPoints, userLevel: newLevel > currentLevel ? newLevel : currentLevel });

    // 3. Gọi API Background
    try {
      const res = await fetch('/api/pwr/mobile/gamification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pointsToAdd })
      });
      if (!res.ok) throw new Error('API Error');
    } catch (error) {
      // 4. Nếu API lỗi hoặc rớt mạng -> Rollback âm thầm
      console.warn('Lỗi mạng, hoàn tác điểm:', error);
      set({ userPoints: currentPoints, userLevel: currentLevel });
      // Ghi chú: Thực tế nên hiện thêm Toast thông báo cho user "Mạng yếu, không lưu được điểm"
    }
  },
}));
