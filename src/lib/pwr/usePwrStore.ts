import { create } from 'zustand';

export type TabType = 'HOME' | 'LEADERBOARD' | 'STATION' | 'REPORTS' | 'PROFILE';
export type StationType = 'CNC' | 'DAN_CANH' | 'KHOAN_CAM' | null;

interface PwrState {
  currentTab: TabType;
  activeStation: StationType;
  setTab: (tab: TabType) => void;
  setActiveStation: (station: StationType) => void;
}

export const usePwrStore = create<PwrState>((set) => ({
  currentTab: 'STATION',
  activeStation: null,
  setTab: (tab) => set({ currentTab: tab }),
  setActiveStation: (station) => set({ activeStation: station }),
}));
