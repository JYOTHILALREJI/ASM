'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { LoginPage } from '@/components/auth/login-page';
import { SignupPage } from '@/components/auth/signup-page';
import { DashboardPage } from '@/components/dashboard/dashboard-page';
import { EmployeePage } from '@/components/employees/employee-page';
import { AttendancePage } from '@/components/attendance/attendance-page';
import { NotificationPage } from '@/components/notifications/notification-page';
import { AdminPage } from '@/components/admins/admin-page';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';

type AppState = 'checking' | 'needs_setup' | 'unauthenticated' | 'authenticated';

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-blue-500 shadow-lg shadow-blue-500/25 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">A</span>
          </div>
          <Skeleton className="h-7 w-24 bg-slate-800" />
          <Skeleton className="h-4 w-48 bg-slate-800" />
        </div>
        <div className="w-full bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 space-y-4">
          <Skeleton className="h-5 w-32 mx-auto bg-slate-700" />
          <Skeleton className="h-4 w-48 mx-auto bg-slate-700" />
          <div className="space-y-3 pt-2">
            <Skeleton className="h-4 w-20 bg-slate-700" />
            <Skeleton className="h-11 w-full rounded-md bg-slate-700" />
            <Skeleton className="h-4 w-20 bg-slate-700" />
            <Skeleton className="h-11 w-full rounded-md bg-slate-700" />
          </div>
          <Skeleton className="h-11 w-full rounded-md bg-slate-700" />
        </div>
      </div>
    </div>
  );
}

function MainLayout() {
  const { currentView } = useAppStore();
  const isMobile = useIsMobile();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardPage />;
      case 'employees':
        return <EmployeePage />;
      case 'attendance':
        return <AttendancePage />;
      case 'notifications':
        return <NotificationPage />;
      case 'admins':
        return <AdminPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-900">
      {!isMobile && <AppSidebar />}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 p-4 md:p-6 overflow-auto">{renderView()}</main>
      </div>
    </div>
  );
}

function getDerivedAppState(user: ReturnType<typeof useAuthStore.getState>['user'], hasUsers: boolean | null): AppState {
  if (user) return 'authenticated';
  if (hasUsers === false) return 'needs_setup';
  if (hasUsers === true) return 'unauthenticated';
  return 'checking';
}

export default function Home() {
  const { user, setUser, setLoading, init } = useAuthStore();
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);
  const hasChecked = useRef(false);

  const resolveState = useCallback((): AppState => {
    return getDerivedAppState(user, hasUsers);
  }, [user, hasUsers]);

  const appState = resolveState();

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    // Try to restore session from localStorage
    init();

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();

        if (cancelled) return;

        const usersExist = data.data?.hasUsers ?? false;
        setHasUsers(usersExist);

        // Check localStorage for stored user
        const stored = typeof window !== 'undefined' ? localStorage.getItem('asm_user') : null;
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setUser(parsed);
          } catch {
            // invalid stored data, clear it
            localStorage.removeItem('asm_user');
          }
        }

        setLoading(false);
      } catch {
        if (cancelled) return;
        setHasUsers(true); // assume users exist on error
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (appState === 'checking') {
    return <LoadingScreen />;
  }

  if (appState === 'needs_setup') {
    return <SignupPage />;
  }

  if (appState === 'unauthenticated') {
    return <LoginPage />;
  }

  return <MainLayout />;
}
