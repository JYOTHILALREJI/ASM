'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  Users,
  Eye,
  Trash2,
  Plus,
  Search,
  Star,
  AlertTriangle,
  ChevronLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Site {
  id: string;
  name: string;
  employeeCount: number;
}

interface SiteEmployee {
  id: string;
  fullName: string;
  employeeId: string;
  position: string | null;
  nationality: string | null;
  rating: number;
  currentSite: string | null;
  status: string;
  photo: string | null;
}

export function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addSiteName, setAddSiteName] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  // View employees state
  const [viewSite, setViewSite] = useState<Site | null>(null);
  const [siteEmployees, setSiteEmployees] = useState<SiteEmployee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmps, setSelectedEmps] = useState<Set<string>>(new Set());

  // Delete states
  const [deleteSiteTarget, setDeleteSiteTarget] = useState<Site | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteEmpDialog, setShowDeleteEmpDialog] = useState(false);
  const [deleteEmpLoading, setDeleteEmpLoading] = useState(false);

  const fetchSites = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sites');
      const json = await res.json();
      if (json.success) {
        setSites(json.data.sites || []);
      }
    } catch {
      setSites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const fetchSiteEmployees = useCallback(async (siteName: string) => {
    try {
      setLoadingEmployees(true);
      const res = await fetch('/api/employees?limit=1000&status=all');
      const json = await res.json();
      if (json.success) {
        const emps = (json.data.employees || []).filter(
          (e: SiteEmployee) => e.currentSite === siteName && e.status !== 'deleted'
        );
        setSiteEmployees(emps);
      }
    } catch {
      setSiteEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  const handleViewSite = useCallback((site: Site) => {
    setViewSite(site);
    setSelectedEmps(new Set());
    setEmpSearch('');
    fetchSiteEmployees(site.name);
  }, [fetchSiteEmployees]);

  const handleCloseView = useCallback(() => {
    setViewSite(null);
    setSiteEmployees([]);
    setSelectedEmps(new Set());
    setEmpSearch('');
  }, []);

  const handleAddSite = useCallback(async () => {
    if (!addSiteName.trim()) return;
    try {
      setAddLoading(true);
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addSiteName.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setAddSiteName('');
        setShowAddDialog(false);
        fetchSites();
      }
    } catch {
      // silent
    } finally {
      setAddLoading(false);
    }
  }, [addSiteName, fetchSites]);

  const handleDeleteSite = useCallback(async () => {
    if (!deleteSiteTarget) return;
    try {
      setDeleteLoading(true);
      const res = await fetch('/api/sites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteSiteTarget.id }),
      });
      const json = await res.json();
      if (json.success) {
        setDeleteSiteTarget(null);
        fetchSites();
      }
    } catch {
      // silent
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteSiteTarget, fetchSites]);

  const handleDeleteEmployees = useCallback(async () => {
    if (selectedEmps.size === 0) return;
    try {
      setDeleteEmpLoading(true);
      await Promise.all(
        Array.from(selectedEmps).map((id) =>
          fetch(`/api/employees/${id}`, { method: 'DELETE' })
        )
      );
      setShowDeleteEmpDialog(false);
      setSelectedEmps(new Set());
      // Refresh employees list for current site
      if (viewSite) {
        fetchSiteEmployees(viewSite.name);
      }
      // Also refresh sites to update counts
      fetchSites();
    } catch {
      // silent
    } finally {
      setDeleteEmpLoading(false);
    }
  }, [selectedEmps, viewSite, fetchSiteEmployees, fetchSites]);

  const toggleSelectEmp = useCallback((id: string) => {
    setSelectedEmps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Filter logic
  const filteredSites = sites.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEmployees = siteEmployees.filter((e) => {
    if (!empSearch) return true;
    const q = empSearch.toLowerCase();
    return (
      e.fullName.toLowerCase().includes(q) ||
      e.employeeId.toLowerCase().includes(q) ||
      (e.position && e.position.toLowerCase().includes(q)) ||
      (e.nationality && e.nationality.toLowerCase().includes(q))
    );
  });

  const toggleSelectAll = useCallback(() => {
    if (selectedEmps.size === filteredEmployees.length) {
      setSelectedEmps(new Set());
    } else {
      setSelectedEmps(new Set(filteredEmployees.map((e) => e.id)));
    }
  }, [selectedEmps, filteredEmployees]);

  // Star rating component
  const StarRating = ({ rating }: { rating: number }) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.25 && rating - fullStars < 0.75;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    const isFull5 = rating >= 4.75;

    return (
      <div className="flex items-center gap-0.5">
        {isFull5 ? (
          // All 5 full
          Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
            />
          ))
        ) : (
          <>
            {Array.from({ length: fullStars }).map((_, i) => (
              <Star
                key={`full-${i}`}
                className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
              />
            ))}
            {hasHalf && (
              <div className="relative">
                <Star className="h-3.5 w-3.5 text-slate-600" />
                <div className="absolute inset-0 overflow-hidden w-1/2">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                </div>
              </div>
            )}
            {Array.from({ length: emptyStars }).map((_, i) => (
              <Star
                key={`empty-${i}`}
                className="h-3.5 w-3.5 text-slate-600"
              />
            ))}
          </>
        )}
        <span className="text-xs text-slate-400 ml-1 font-medium">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Sites</h2>
          <p className="text-slate-400 mt-1">
            Manage work sites and view employees assigned to each site.
          </p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Site
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search sites..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:ring-emerald-500/20 focus:border-emerald-500/50"
        />
      </div>

      {/* Sites Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 bg-slate-800 rounded-xl" />
          ))}
        </div>
      ) : filteredSites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-12 w-12 text-slate-600 mb-3" />
          <p className="text-slate-400 text-lg font-medium">No sites found</p>
          <p className="text-slate-500 text-sm mt-1">
            {search ? 'Try a different search term.' : 'Create your first site to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSites.map((site) => (
            <Card
              key={site.id}
              className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50 transition-all group"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                      <Building2 className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base text-white truncate">
                        {site.name}
                      </CardTitle>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                    onClick={() => setDeleteSiteTarget(site)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                  <Users className="h-4 w-4" />
                  <span>
                    <span className="text-white font-semibold">{site.employeeCount}</span>{' '}
                    {site.employeeCount === 1 ? 'employee' : 'employees'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="w-full bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 gap-2 transition-all"
                  onClick={() => handleViewSite(site)}
                >
                  <Eye className="h-4 w-4" />
                  View Employees
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Site Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-200">
          <DialogHeader>
            <DialogTitle>Add New Site</DialogTitle>
            <DialogDescription className="text-slate-400">
              Enter a name for the new work site.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Site name"
            value={addSiteName}
            onChange={(e) => setAddSiteName(e.target.value)}
            className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:ring-emerald-500/20 focus:border-emerald-500/50"
            onKeyDown={(e) => e.key === 'Enter' && handleAddSite()}
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowAddDialog(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSite}
              disabled={!addSiteName.trim() || addLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {addLoading ? 'Adding...' : 'Add Site'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Site Confirmation */}
      <Dialog open={!!deleteSiteTarget} onOpenChange={(open) => !open && setDeleteSiteTarget(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Site</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete <span className="text-white font-semibold">{deleteSiteTarget?.name}</span>?
              All employees assigned to this site will be unassigned, but they won&apos;t be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteSiteTarget(null)}
              className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSite}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete Site'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Site Employees Dialog */}
      <Dialog open={!!viewSite} onOpenChange={(open) => !open && handleCloseView()}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-200 max-w-4xl max-h-[85vh] flex flex-col">
          <DialogTitle className="sr-only">Employees at {viewSite?.name}</DialogTitle>
          <DialogDescription className="sr-only">List of employees assigned to this site</DialogDescription>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseView}
                className="h-8 w-8 text-slate-400 hover:text-white shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <DialogTitle className="text-lg text-white">
                  {viewSite?.name}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  {siteEmployees.length} {siteEmployees.length === 1 ? 'employee' : 'employees'} assigned
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Search + Delete Selected */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search employees..."
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                className="pl-10 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:ring-emerald-500/20 focus:border-emerald-500/50"
              />
            </div>
            {selectedEmps.size > 0 && (
              <Button
                variant="destructive"
                className="gap-2"
                onClick={() => setShowDeleteEmpDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected ({selectedEmps.size})
              </Button>
            )}
          </div>

          <Separator className="bg-slate-700/50" />

          {/* Employee Table */}
          <div className="flex-1 overflow-auto rounded-lg">
            {loadingEmployees ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full bg-slate-700 rounded-lg" />
                ))}
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-8 w-8 text-slate-600 mb-2" />
                <p className="text-sm text-slate-500">
                  {empSearch ? 'No employees match your search.' : 'No employees assigned to this site.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedEmps.size === filteredEmployees.length && filteredEmployees.length > 0}
                        onCheckedChange={toggleSelectAll}
                        className="border-slate-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                    </TableHead>
                    <TableHead className="text-slate-400 font-semibold">Employee</TableHead>
                    <TableHead className="text-slate-400 font-semibold">ID</TableHead>
                    <TableHead className="text-slate-400 font-semibold">Position</TableHead>
                    <TableHead className="text-slate-400 font-semibold">Rating</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => (
                    <TableRow
                      key={emp.id}
                      className="border-slate-700/50 hover:bg-slate-700/30"
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedEmps.has(emp.id)}
                          onCheckedChange={() => toggleSelectEmp(emp.id)}
                          className="border-slate-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {emp.photo ? (
                            <img
                              src={emp.photo}
                              alt={emp.fullName}
                              className="h-8 w-8 rounded-full object-cover border border-slate-600"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-medium text-slate-300 border border-slate-600">
                              {emp.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {emp.fullName}
                            </p>
                            {emp.nationality && (
                              <p className="text-xs text-slate-500">{emp.nationality}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm font-mono">
                        {emp.employeeId}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm">
                        {emp.position || <span className="text-slate-600">—</span>}
                      </TableCell>
                      <TableCell>
                        <StarRating rating={emp.rating} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={`text-xs ${
                            emp.status === 'active'
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : emp.status === 'pending_deletion'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}
                        >
                          {emp.status === 'pending_deletion' ? 'Pending' : emp.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Selected Employees Confirmation */}
      <Dialog open={showDeleteEmpDialog} onOpenChange={setShowDeleteEmpDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Delete {selectedEmps.size} {selectedEmps.size === 1 ? 'Employee' : 'Employees'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete {selectedEmps.size}{' '}
              {selectedEmps.size === 1 ? 'employee' : 'employees'} from this site? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteEmpDialog(false)}
              className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEmployees}
              disabled={deleteEmpLoading}
            >
              {deleteEmpLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
