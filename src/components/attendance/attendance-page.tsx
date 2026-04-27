'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  Search,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

/* ───────── types ───────── */
interface Employee {
  id: string;
  fullName: string;
  employeeId: string;
  currentSite: string | null;
  status: string;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  status: 'present' | 'absent' | 'no_site' | 'overtime' | 'not_marked';
  overtimeHours: number | null;
  employee?: { id: string; fullName: string; employeeId: string };
}

type StatusOption = AttendanceRecord['status'];
type ViewMode = 'list' | 'calendar';

/* ───────── helpers ───────── */
const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const YEARS = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function formatDate(day: number, monthStr: string, yearStr: string): string {
  return `${yearStr}-${monthStr}-${String(day).padStart(2, '0')}`;
}

function isFutureDate(day: number, month: number, year: number): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const check = new Date(year, month - 1, day);
  return check > today;
}

function isFriday(year: number, month: number, day: number): boolean {
  return new Date(year, month - 1, day).getDay() === 5;
}

const STATUS_CONFIG: Record<StatusOption, { label: string; short: string; color: string; dotColor: string }> = {
  present: { label: 'Present', short: 'P', color: 'bg-green-500/20 text-green-400', dotColor: 'bg-green-500' },
  absent: { label: 'Absent', short: 'A', color: 'bg-red-500/20 text-red-400', dotColor: 'bg-red-500' },
  no_site: { label: 'No Site', short: 'NS', color: 'bg-amber-500/20 text-amber-400', dotColor: 'bg-amber-500' },
  overtime: { label: 'Overtime', short: 'O', color: 'bg-blue-500/20 text-blue-400', dotColor: 'bg-blue-500' },
  not_marked: { label: 'Not Marked', short: '-', color: 'bg-slate-600/20 text-slate-500', dotColor: 'bg-slate-600' },
};

const STATUS_OPTIONS: StatusOption[] = ['present', 'absent', 'no_site', 'overtime', 'not_marked'];

/* ───────── Status Dropdown ───────── */
interface StatusDropdownProps {
  employeeId: string;
  date: string;
  currentStatus: StatusOption;
  currentOvertimeHours: number | null;
  onClose: () => void;
  onStatusChange: (employeeId: string, date: string, status: StatusOption, overtimeHours?: number | null) => void;
  position: { top: number; left: number };
}

function StatusDropdown({
  employeeId,
  date,
  currentStatus,
  currentOvertimeHours,
  onClose,
  onStatusChange,
  position,
}: StatusDropdownProps) {
  const [selectedStatus, setSelectedStatus] = useState<StatusOption>(currentStatus);
  const [overtimeHours, setOvertimeHours] = useState<string>(
    currentOvertimeHours ? String(currentOvertimeHours) : '2'
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleConfirm = () => {
    const hours = selectedStatus === 'overtime' ? parseFloat(overtimeHours) || 0 : null;
    onStatusChange(employeeId, date, selectedStatus, hours);
    onClose();
  };

  return (
    <div
      ref={ref}
      className="fixed z-[100] w-52 rounded-xl border border-slate-600 bg-slate-800 p-2 shadow-xl shadow-black/40"
      style={{ top: Math.max(8, position.top - 240), left: Math.min(position.left, window.innerWidth - 220) }}
    >
      <div className="mb-2 px-2 py-1.5 text-xs font-medium text-slate-400 border-b border-slate-700">
        {date}
      </div>
      <div className="flex flex-col gap-0.5">
        {STATUS_OPTIONS.map((status) => {
          const cfg = STATUS_CONFIG[status];
          return (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors text-left w-full',
                selectedStatus === status ? 'bg-slate-700/80 text-white' : 'text-slate-300 hover:bg-slate-700/50'
              )}
            >
              <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', cfg.dotColor)} />
              <span>{cfg.label}</span>
              {selectedStatus === status && (
                <Check className="ml-auto h-3.5 w-3.5 text-blue-400" />
              )}
            </button>
          );
        })}
      </div>
      {selectedStatus === 'overtime' && (
        <div className="mt-2 px-2">
          <label className="text-xs text-slate-400 mb-1 block">Overtime Hours</label>
          <Input
            type="number"
            min="0"
            max="24"
            step="0.5"
            value={overtimeHours}
            onChange={(e) => setOvertimeHours(e.target.value)}
            className="h-8 bg-slate-900 border-slate-600 text-white text-sm"
          />
        </div>
      )}
      <div className="mt-2 pt-2 border-t border-slate-700">
        <Button
          onClick={handleConfirm}
          size="sm"
          className="w-full h-8 bg-blue-500 hover:bg-blue-600 text-white text-xs"
        >
          Save
        </Button>
      </div>
    </div>
  );
}

/* ───────── List View ───────── */
interface ListViewProps {
  employees: Employee[];
  attendanceMap: Map<string, AttendanceRecord>;
  daysInMonth: number;
  monthStr: string;
  yearStr: string;
  month: number;
  year: number;
  loading: boolean;
  onStatusChange: (employeeId: string, date: string, status: StatusOption, overtimeHours?: number | null) => void;
}

function ListView({
  employees,
  attendanceMap,
  daysInMonth,
  monthStr,
  yearStr,
  month,
  year,
  loading,
  onStatusChange,
}: ListViewProps) {
  const [dropdown, setDropdown] = useState<{
    employeeId: string;
    date: string;
    status: StatusOption;
    overtimeHours: number | null;
    position: { top: number; left: number };
  } | null>(null);

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full bg-slate-700/50" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (employees.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="py-16 text-center">
          <p className="text-sm text-slate-400">No active employees found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
      <ScrollArea className="w-full">
        <div className="min-w-[900px]">
          {/* Header row */}
          <div className="flex items-center bg-slate-900/80 border-b border-slate-700 text-xs font-medium text-slate-400 sticky top-0 z-10">
            <div className="w-48 shrink-0 px-4 py-3">Employee</div>
            <div className="w-28 shrink-0 px-3 py-3">ID</div>
            <div className="w-32 shrink-0 px-3 py-3">Site</div>
            <div className="flex-1 flex">
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const isFri = isFriday(year, month, day);
                const isFuture = isFutureDate(day, month, year);
                return (
                  <div
                    key={day}
                    className={cn(
                      'w-9 shrink-0 text-center py-3',
                      isFri && 'text-red-400/50',
                      isFuture && 'opacity-40'
                    )}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
            <div className="w-16 shrink-0 text-center py-3 px-2">OT</div>
          </div>

          {/* Employee rows */}
          <div className="divide-y divide-slate-700/50">
            {employees.map((emp) => {
              const totalOT = Array.from(attendanceMap.values())
                .filter((r) => r.employeeId === emp.id && r.status === 'overtime')
                .reduce((sum, r) => sum + (r.overtimeHours || 0), 0);

              return (
                <div
                  key={emp.id}
                  className="flex items-center hover:bg-slate-700/20 transition-colors"
                >
                  <div className="w-48 shrink-0 px-4 py-2.5">
                    <span className="text-sm text-white font-medium truncate block">
                      {emp.fullName}
                    </span>
                  </div>
                  <div className="w-28 shrink-0 px-3 py-2.5">
                    <span className="text-xs text-slate-400 font-mono">{emp.employeeId}</span>
                  </div>
                  <div className="w-32 shrink-0 px-3 py-2.5">
                    <span className="text-xs text-slate-400 truncate block">
                      {emp.currentSite || '—'}
                    </span>
                  </div>
                  <div className="flex-1 flex">
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                      const dateStr = formatDate(day, monthStr, yearStr);
                      const record = attendanceMap.get(`${emp.id}-${dateStr}`);
                      const status = record?.status || 'not_marked';
                      const cfg = STATUS_CONFIG[status];
                      const isFri = isFriday(year, month, day);
                      const isFuture = isFutureDate(day, month, year);

                      return (
                        <div
                          key={day}
                          className={cn(
                            'w-9 shrink-0 flex items-center justify-center py-1.5',
                            isFri && 'bg-red-500/5',
                            isFuture && 'opacity-30'
                          )}
                        >
                          {!isFuture && !isFri ? (
                            <button
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setDropdown({
                                  employeeId: emp.id,
                                  date: dateStr,
                                  status,
                                  overtimeHours: record?.overtimeHours || null,
                                  position: { top: rect.top, left: rect.left },
                                });
                              }}
                              className={cn(
                                'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all hover:ring-2 hover:ring-slate-500/50',
                                cfg.color
                              )}
                              title={`${cfg.label}${status === 'overtime' && record?.overtimeHours ? ` (${record.overtimeHours}h)` : ''}`}
                            >
                              {cfg.short}
                            </button>
                          ) : (
                            <span className={cn(
                              'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium',
                              isFri ? 'bg-red-500/10 text-red-400/40' : 'text-slate-600'
                            )}>
                              {isFri ? 'F' : '-'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="w-16 shrink-0 text-center py-2.5 px-2">
                    {totalOT > 0 ? (
                      <span className="text-xs font-medium text-blue-400">{totalOT}h</span>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-4 py-3 border-t border-slate-700/50">
        {STATUS_OPTIONS.map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <div key={s} className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', cfg.dotColor)} />
              <span className="text-[11px] text-slate-400">{cfg.label}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-400/40" />
          <span className="text-[11px] text-slate-400">Friday</span>
        </div>
      </div>

      {/* Status Dropdown */}
      {dropdown && (
        <StatusDropdown
          employeeId={dropdown.employeeId}
          date={dropdown.date}
          currentStatus={dropdown.status}
          currentOvertimeHours={dropdown.overtimeHours}
          onStatusChange={onStatusChange}
          onClose={() => setDropdown(null)}
          position={dropdown.position}
        />
      )}
    </Card>
  );
}

/* ───────── Calendar View ───────── */
interface CalendarViewProps {
  employees: Employee[];
  attendanceMap: Map<string, AttendanceRecord>;
  monthStr: string;
  yearStr: string;
  month: number;
  year: number;
  loading: boolean;
  selectedEmployeeId: string;
  onSelectedEmployeeChange: (id: string) => void;
  onStatusChange: (employeeId: string, date: string, status: StatusOption, overtimeHours?: number | null) => void;
}

function CalendarView({
  employees,
  attendanceMap,
  monthStr,
  yearStr,
  month,
  year,
  loading,
  selectedEmployeeId,
  onSelectedEmployeeChange,
  onStatusChange,
}: CalendarViewProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=Sunday
  const [dropdown, setDropdown] = useState<{
    employeeId: string;
    date: string;
    status: StatusOption;
    overtimeHours: number | null;
    position: { top: number; left: number };
  } | null>(null);

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    // Pad start
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [firstDayOfWeek, daysInMonth]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getStatusForDay = useCallback(
    (day: number) => {
      const dateStr = formatDate(day, monthStr, yearStr);
      const record = attendanceMap.get(`${selectedEmployeeId}-${dateStr}`);
      return record?.status || 'not_marked';
    },
    [attendanceMap, selectedEmployeeId, monthStr, yearStr]
  );

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-6">
          <Skeleton className="h-10 w-64 mb-6 bg-slate-700/50" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg bg-slate-700/50" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardContent className="p-4 md:p-6">
        {/* Employee selector */}
        <div className="mb-6">
          <label className="text-sm text-slate-400 mb-2 block font-medium">Select Employee</label>
          <Select value={selectedEmployeeId} onValueChange={onSelectedEmployeeChange}>
            <SelectTrigger className="w-full max-w-sm bg-slate-900 border-slate-600 text-white">
              <SelectValue placeholder="Select employee..." />
            </SelectTrigger>
            <SelectContent className="dropdown-upward bg-slate-800 border-slate-600 max-h-64">
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id} className="text-slate-200 focus:bg-slate-700 focus:text-white">
                  {emp.fullName} ({emp.employeeId})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedEmployee && (
          <>
            {/* Summary */}
            <div className="flex flex-wrap gap-3 mb-6">
              {STATUS_OPTIONS.map((s) => {
                const count = Array.from({ length: daysInMonth }, (_, i) => i + 1).filter(
                  (d) => !isFriday(year, month, d) && !isFutureDate(d, month, year) && getStatusForDay(d) === s
                ).length;
                const cfg = STATUS_CONFIG[s];
                return (
                  <div key={s} className={cn('px-3 py-1.5 rounded-lg flex items-center gap-2', cfg.color)}>
                    <span className={cn('h-2 w-2 rounded-full', cfg.dotColor)} />
                    <span className="text-xs font-medium">{count}</span>
                    <span className="text-[11px] opacity-80">{cfg.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Calendar grid */}
            <div className="border border-slate-700/50 rounded-xl overflow-hidden">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 bg-slate-900/80">
                {weekDays.map((wd) => (
                  <div
                    key={wd}
                    className={cn(
                      'text-center py-2.5 text-xs font-medium border-b border-slate-700/50',
                      wd === 'Fri' ? 'text-red-400/60' : 'text-slate-400'
                    )}
                  >
                    {wd}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="min-h-[72px] md:min-h-[88px] border-b border-r border-slate-700/30 bg-slate-900/30"
                      />
                    );
                  }

                  const dateStr = formatDate(day, monthStr, yearStr);
                  const status = getStatusForDay(day);
                  const cfg = STATUS_CONFIG[status];
                  const isFri = isFriday(year, month, day);
                  const isFut = isFutureDate(day, month, year);
                  const record = attendanceMap.get(`${selectedEmployeeId}-${dateStr}`);

                  return (
                    <div
                      key={day}
                      className={cn(
                        'min-h-[72px] md:min-h-[88px] border-b border-r border-slate-700/30 p-1.5 md:p-2 flex flex-col',
                        isFri && 'bg-red-500/5',
                        isFut && 'opacity-40'
                      )}
                    >
                      <span className={cn(
                        'text-xs font-medium mb-1',
                        isFri ? 'text-red-400/60' : 'text-slate-300'
                      )}>
                        {day}
                      </span>
                      {!isFut && !isFri && (
                        <button
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setDropdown({
                              employeeId: selectedEmployeeId,
                              date: dateStr,
                              status,
                              overtimeHours: record?.overtimeHours || null,
                              position: { top: rect.top, left: rect.left },
                            });
                          }}
                          className={cn(
                            'flex-1 rounded-lg flex items-center justify-center text-xs font-medium transition-all hover:ring-2 hover:ring-slate-500/50',
                            cfg.color
                          )}
                        >
                          <span className="truncate">{cfg.short}</span>
                        </button>
                      )}
                      {status === 'overtime' && record?.overtimeHours && (
                        <span className="text-[10px] text-blue-400 mt-0.5 text-center">
                          {record.overtimeHours}h
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {dropdown && (
          <StatusDropdown
            employeeId={dropdown.employeeId}
            date={dropdown.date}
            currentStatus={dropdown.status}
            currentOvertimeHours={dropdown.overtimeHours}
            onStatusChange={onStatusChange}
            onClose={() => setDropdown(null)}
            position={dropdown.position}
          />
        )}
      </CardContent>
    </Card>
  );
}

/* ───────── Main Page ───────── */
export function AttendancePage() {
  const { user } = useAuthStore();

  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentMonth).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(true);

  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const month = parseInt(selectedMonth, 10);
  const year = parseInt(selectedYear, 10);
  const monthStr = selectedMonth;
  const yearStr = selectedYear;
  const daysInMonth = getDaysInMonth(year, month);

  // Build attendance map: key = "employeeId-date"
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const r of attendanceRecords) {
      map.set(`${r.employeeId}-${r.date}`, r);
    }
    return map;
  }, [attendanceRecords]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.ceil(totalEmployees / pageSize);

  // Fetch employees with search and pagination
  useEffect(() => {
    let cancelled = false;
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const params = new URLSearchParams({
          limit: String(pageSize),
          page: String(page),
          status: 'active',
        });
        if (searchDebounce) params.set('search', searchDebounce);
        const res = await fetch(`/api/employees?${params.toString()}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          const emps: Employee[] = (data.data.employees || []).filter(
            (e: Employee) => e.currentSite !== 'Idle'
          );
          setEmployees(emps);
          setTotalEmployees(data.data.total || 0);
          if (!selectedEmployeeId && emps.length > 0) {
            setSelectedEmployeeId(emps[0].id);
          }
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to fetch employees', variant: 'destructive' });
      } finally {
        if (!cancelled) setLoadingEmployees(false);
      }
    };
    fetchEmployees();
    return () => { cancelled = true; };
  }, [searchDebounce, page]);

  // Fetch attendance
  useEffect(() => {
    let cancelled = false;
    const fetchAttendance = async () => {
      setLoadingAttendance(true);
      try {
        const monthParam = `${yearStr}-${monthStr}`;
        const res = await fetch(`/api/attendance?month=${monthParam}&year=${yearStr}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          setAttendanceRecords(data.data.records || []);
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to fetch attendance', variant: 'destructive' });
      } finally {
        if (!cancelled) setLoadingAttendance(false);
      }
    };
    fetchAttendance();
  }, [yearStr, monthStr]);

  // Handle status change
  const handleStatusChange = useCallback(
    async (employeeId: string, date: string, status: StatusOption, overtimeHours?: number | null) => {
      try {
        const body: Record<string, unknown> = { employeeId, date, status };
        if (status === 'overtime' && overtimeHours !== undefined && overtimeHours !== null) {
          body.overtimeHours = overtimeHours;
        }
        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.success) {
          // Optimistically update local state
          setAttendanceRecords((prev) => {
            const exists = prev.find(
              (r) => r.employeeId === employeeId && r.date === date
            );
            if (exists) {
              return prev.map((r) =>
                r.employeeId === employeeId && r.date === date
                  ? { ...r, status, overtimeHours: status === 'overtime' ? (overtimeHours ?? null) : null }
                  : r
              );
            }
            return [
              ...prev,
              {
                id: data.data.attendance.id,
                employeeId,
                date,
                status,
                overtimeHours: status === 'overtime' ? (overtimeHours ?? null) : null,
              },
            ];
          });
          toast({ title: 'Updated', description: `Attendance marked as ${STATUS_CONFIG[status].label}` });
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to update attendance', variant: 'destructive' });
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to update attendance', variant: 'destructive' });
      }
    },
    []
  );

  // Navigation handlers
  const goToPrevMonth = () => {
    let m = month - 1;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    setSelectedMonth(String(m).padStart(2, '0'));
    setSelectedYear(String(y));
  };

  const goToNextMonth = () => {
    let m = month + 1;
    let y = year;
    if (m > 12) { m = 1; y += 1; }
    setSelectedMonth(String(m).padStart(2, '0'));
    setSelectedYear(String(y));
  };

  const isCurrentMonth = month === currentMonth && year === currentYear;

  const monthLabel = MONTHS.find((m) => m.value === monthStr)?.label || '';

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Attendance Management</h2>
          <p className="text-slate-400 mt-1 text-sm">
            Track and manage daily employee attendance
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              viewMode === 'list'
                ? 'bg-blue-500 text-white'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <List className="h-4 w-4" />
            List
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              viewMode === 'calendar'
                ? 'bg-blue-500 text-white'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <Calendar className="h-4 w-4" />
            Calendar
          </button>
        </div>
      </div>

      {/* Month/Year Navigation + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Month Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevMonth}
            className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg border border-slate-700 px-3 py-1.5 min-w-[220px]">
            <span className="text-sm font-semibold text-white">{monthLabel}</span>
            <span className="text-slate-500">•</span>
            <span className="text-sm text-slate-300">{yearStr}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
            className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Year Select */}
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-28 bg-slate-800 border-slate-700 text-sm text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dropdown-upward bg-slate-800 border-slate-600">
            {YEARS.map((y) => (
              <SelectItem key={y} value={y} className="text-slate-200 focus:bg-slate-700 focus:text-white">
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Month Select */}
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-36 bg-slate-800 border-slate-700 text-sm text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dropdown-upward bg-slate-800 border-slate-600 max-h-64">
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value} className="text-slate-200 focus:bg-slate-700 focus:text-white">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-slate-800 border-slate-700 text-sm text-white placeholder:text-slate-500 focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Showing <span className="text-white font-medium">{employees.length}</span> of{' '}
          <span className="text-white font-medium">{totalEmployees}</span> employees
          {searchDebounce && <span> matching &ldquo;<span className="text-emerald-400">{searchDebounce}</span>&rdquo;</span>}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 px-2">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-8 w-8 text-sm font-medium',
                      page === pageNum
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    )}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative">
        {viewMode === 'list' ? (
          <ListView
            employees={employees}
            attendanceMap={attendanceMap}
            daysInMonth={daysInMonth}
            monthStr={monthStr}
            yearStr={yearStr}
            month={month}
            year={year}
            loading={loadingEmployees || loadingAttendance}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <CalendarView
            employees={employees}
            attendanceMap={attendanceMap}
            monthStr={monthStr}
            yearStr={yearStr}
            month={month}
            year={year}
            loading={loadingEmployees || loadingAttendance}
            selectedEmployeeId={selectedEmployeeId}
            onSelectedEmployeeChange={setSelectedEmployeeId}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>
    </div>
  );
}
