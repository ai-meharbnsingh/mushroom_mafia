import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Plus, Search, Download, Trash2, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { TypeBadge } from '@/components/ui-custom/TypeBadge';
import { EmptyState } from '@/components/ui-custom/EmptyState';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { reportService } from '@/services/reportService';
import { mapReport } from '@/utils/mappers';
import type { Report } from '@/types';

// Backend-specific report type values
const REPORT_TYPE_OPTIONS = [
  { value: 'daily_summary', label: 'Daily Summary' },
  { value: 'weekly_summary', label: 'Weekly Summary' },
  { value: 'alert_report', label: 'Alert Report' },
  { value: 'harvest_report', label: 'Harvest Report' },
] as const;

const reportTypeDisplayName = (type: string): string => {
  const upper = type.toUpperCase();
  const map: Record<string, string> = {
    DAILY_SUMMARY: 'Daily Summary',
    WEEKLY_SUMMARY: 'Weekly Summary',
    ALERT_REPORT: 'Alert Report',
    HARVEST_REPORT: 'Harvest Report',
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    MONTHLY: 'Monthly',
    CUSTOM: 'Custom',
  };
  return map[upper] || type;
};

export const Reports: React.FC = () => {
  const { state, dispatch } = useApp();
  const toast = useToast();
  const { checkPermission } = useAuth();
  const tableRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state for generating a report
  const [formReportType, setFormReportType] = useState<string>('daily_summary');
  const [formPlantId, setFormPlantId] = useState<string>('ALL');
  const [formDateFrom, setFormDateFrom] = useState(
    new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  );
  const [formDateTo, setFormDateTo] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Fetch reports on mount
  useEffect(() => {
    setLoading(true);
    reportService
      .getAll()
      .then((data: any[]) => {
        const mapped = (Array.isArray(data) ? data : []).map(mapReport);
        dispatch({ type: 'SET_REPORTS', payload: mapped });
      })
      .catch(() => {
        toast.error('Failed to load reports');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate table rows
  useEffect(() => {
    if (tableRef.current && !loading) {
      gsap.fromTo(
        tableRef.current.querySelectorAll('tr'),
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.03, ease: 'power3.out' }
      );
    }
  }, [loading, state.reports.length]);

  // Filter reports
  const filteredReports = state.reports.filter((report) => {
    if (searchQuery === '') return true;
    const q = searchQuery.toLowerCase();
    return (
      report.name.toLowerCase().includes(q) ||
      reportTypeDisplayName(report.type).toLowerCase().includes(q)
    );
  });

  const handleGenerate = async () => {
    // Validate plant selection
    if (formPlantId === 'ALL' && state.plants.length > 0) {
      // Use first plant if none selected since backend requires plant_id
      // Or show an error
    }

    const selectedPlantId =
      formPlantId !== 'ALL' ? Number(formPlantId) : state.plants.length > 0 ? Number(state.plants[0].id) : undefined;

    if (!selectedPlantId) {
      toast.error('Please select a plant');
      return;
    }

    // Build a descriptive report name
    const plantName = state.plants.find((p) => p.id === String(selectedPlantId))?.name ?? 'Unknown';
    const typeLabel = REPORT_TYPE_OPTIONS.find((o) => o.value === formReportType)?.label ?? formReportType;
    const reportName = `${typeLabel} - ${plantName} (${formDateFrom} to ${formDateTo})`;

    setGenerating(true);
    try {
      const res = await reportService.generate({
        plant_id: selectedPlantId,
        report_type: formReportType,
        report_name: reportName,
        format: 'CSV',
        date_from: formDateFrom,
        date_to: formDateTo,
      });
      dispatch({ type: 'ADD_REPORT', payload: mapReport(res) });
      toast.success('Report generated successfully');
      setIsDrawerOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await reportService.delete(Number(deleteTarget.id));
      dispatch({ type: 'DELETE_REPORT', payload: deleteTarget.id });
      toast.success('Report deleted');
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to delete report');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (report: Report) => {
    setDownloadingId(report.id);
    try {
      await reportService.download(Number(report.id));
      toast.success(`Downloaded ${report.name}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to download report');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-iot-primary mb-1">Reports</h1>
          <p className="text-sm text-iot-secondary">Generate and download reports</p>
        </div>
        <Button
          onClick={() => setIsDrawerOpen(true)}
          className="gradient-primary text-iot-bg-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-iot-muted" />
          <Input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-dark pl-10 w-full"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-iot-cyan animate-spin" />
          <span className="ml-3 text-sm text-iot-muted">Loading reports...</span>
        </div>
      ) : filteredReports.length > 0 ? (
        /* Table */
        <div
          ref={tableRef}
          className="bg-iot-secondary rounded-2xl border border-iot-subtle overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Report Name</th>
                  <th>Type</th>
                  <th>Format</th>
                  <th>Date Range</th>
                  <th>Size</th>
                  <th>Generated At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-iot-tertiary/30">
                    <td className="font-medium">{report.name}</td>
                    <td>
                      <TypeBadge type={report.type} variant="report" />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-iot-muted" />
                        <TypeBadge type={report.format} variant="format" />
                      </div>
                    </td>
                    <td className="text-xs text-iot-muted">
                      {new Date(report.dateFrom).toLocaleDateString()} -{' '}
                      {new Date(report.dateTo).toLocaleDateString()}
                    </td>
                    <td className="text-sm text-iot-secondary">
                      {report.fileSize || '-'}
                    </td>
                    <td className="text-iot-muted text-xs">
                      {new Date(report.generatedAt).toLocaleString()}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownload(report)}
                          disabled={downloadingId === report.id}
                          className="p-1.5 rounded-lg text-iot-secondary hover:text-iot-cyan hover:bg-iot-cyan/10 transition-colors disabled:opacity-50"
                          title="Download"
                        >
                          {downloadingId === report.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                        {checkPermission('ADMIN') && (
                          <button
                            onClick={() => setDeleteTarget(report)}
                            className="p-1.5 rounded-lg text-iot-secondary hover:text-iot-red hover:bg-iot-red/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No reports found"
          description="Generate your first report to get started."
          actionLabel="Generate Report"
          onAction={() => setIsDrawerOpen(true)}
        />
      )}

      {/* Generate Report Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="bg-iot-secondary border-iot-subtle w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-iot-primary">Generate Report</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-6">
            {/* Report Type */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Report Type
              </label>
              <Select value={formReportType} onValueChange={setFormReportType}>
                <SelectTrigger className="input-dark w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-iot-secondary border-iot-subtle">
                  {REPORT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Plant */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Plant
              </label>
              <Select value={formPlantId} onValueChange={setFormPlantId}>
                <SelectTrigger className="input-dark w-full">
                  <SelectValue placeholder="Select a plant" />
                </SelectTrigger>
                <SelectContent className="bg-iot-secondary border-iot-subtle">
                  {state.plants.length > 1 && (
                    <SelectItem value="ALL">All Plants</SelectItem>
                  )}
                  {state.plants.map((plant) => (
                    <SelectItem key={plant.id} value={plant.id}>
                      {plant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                  Date From
                </label>
                <Input
                  type="date"
                  value={formDateFrom}
                  onChange={(e) => setFormDateFrom(e.target.value)}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                  Date To
                </label>
                <Input
                  type="date"
                  value={formDateTo}
                  onChange={(e) => setFormDateTo(e.target.value)}
                  className="input-dark w-full"
                />
              </div>
            </div>
          </div>

          <SheetFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDrawerOpen(false)}
              className="border-iot-subtle text-iot-secondary"
              disabled={generating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="gradient-primary text-iot-bg-primary"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate'
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="bg-iot-secondary border-iot-subtle">
          <DialogHeader>
            <DialogTitle className="text-iot-primary">Delete Report</DialogTitle>
            <DialogDescription className="text-iot-secondary">
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="border-iot-subtle text-iot-secondary"
              disabled={deletingId === deleteTarget?.id}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deletingId === deleteTarget?.id}
              className="bg-iot-red text-white hover:bg-iot-red/90"
            >
              {deletingId === deleteTarget?.id ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;
