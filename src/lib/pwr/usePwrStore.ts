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
  addPoints: (pointsToAdd) => set((state) => {
    const newPoints = state.userPoints + pointsToAdd;
    const newLevel = Math.floor(Math.sqrt(newPoints / 100)) + 1;
    return { userPoints: newPoints, userLevel: newLevel > state.userLevel ? newLevel : state.userLevel };
  }),
}));
