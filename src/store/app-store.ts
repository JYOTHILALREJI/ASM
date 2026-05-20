import { create } from 'zustand';

export type AppView = 'dashboard' | 'employees' | 'sites' | 'attendance' | 'notifications' | 'admins' | 'leave_requests' | 'cancellation_requests' | 'uniform_registry';

interface AppState {
  currentView: AppView;
  sidebarOpen: boolean;
  employeeFilter: string; // Filter to apply when navigating to employees page (e.g., 'idle', 'working', '')
  setCurrentView: (view: AppView) => void;
  setSidebarOpen: (open: boolean) => void;
  navigateToEmployees: (filter?: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  sidebarOpen: true,
  employeeFilter: '',
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setCurrentView: (currentView) => set({ currentView }),
  navigateToEmployees: (filter = '') => set({ currentView: 'employees', employeeFilter: filter }),
}));
