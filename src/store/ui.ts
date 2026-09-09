import { create } from "zustand";

/**
 * state ของ UI ที่หลายหน้าต้องใช้ร่วมกัน
 *
 * ข้อมูลที่มาจากเซิร์ฟเวอร์ไม่ควรเก็บที่นี่ ให้ fetch ในหน้าที่ใช้แทน
 * ไม่งั้นจะต้องมาคอยไล่ล้าง cache เอง
 */
type UiState = {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}; //

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
