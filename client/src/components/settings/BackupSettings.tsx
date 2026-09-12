import React, { useState, useEffect, useRef } from 'react';
import {
  Archive,
  Download,
  RotateCcw,
  Trash2,
  ShieldCheck,
  UploadCloud,
  FileCheck,
  HardDrive,
  Cloud,
  Loader2,
  Shield,
  Clock,
  Database,
  Layers,
  Calendar,
  Play,
  Save,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { BackupRecord, BackupScheduleConfig } from '../../types';
import * as api from '../../api/client';
import { useNotes } from '../../context/NotesContext';

export const BackupSettings: React.FC = () => {
  const { isOwner, showToast, loadNotes, loadTags, openConfirmDialog } = useNotes();
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Manual Backup wizard state
  const [backupType, setBackupType] = useState<'database_only' | 'full'>('database_only');
  const [selectedStorage, setSelectedStorage] = useState<'local' | 's3' | 'gdrive'>('local');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null);
  const [isVerifyingId, setIsVerifyingId] = useState<string | null>(null);

  // Automated Schedule state
  const [schedule, setSchedule] = useState<BackupScheduleConfig | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleIntervalDays, setScheduleIntervalDays] = useState(1);
  const [scheduleBackupType, setScheduleBackupType] = useState<'database_only' | 'full'>('database_only');
  const [scheduleStorage, setScheduleStorage] = useState<'local' | 's3' | 'gdrive'>('local');
  const [scheduleRetention, setScheduleRetention] = useState(7);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isRunningScheduleNow, setIsRunningScheduleNow] = useState(false);

  // Upload restore state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Copied checksum tracking
  const [copiedChecksumId, setCopiedChecksumId] = useState<string | null>(null);

  const loadBackupsAndSchedule = async () => {
    try {
      setLoading(true);
      const [backupsData, scheduleData] = await Promise.all([
        api.fetchBackups(),
        api.fetchBackupSchedule(),
      ]);
      setBackups(backupsData);
      if (scheduleData) {
        setSchedule(scheduleData);
        setScheduleEnabled(scheduleData.enabled);
        setScheduleIntervalDays(scheduleData.interval_days || 1);
        setScheduleBackupType(scheduleData.backup_type || 'database_only');
        setScheduleStorage(scheduleData.storage_provider || 'local');
        setScheduleRetention(scheduleData.retention_count ?? 7);
      }
    } catch (err: any) {
      showToast('Failed to load backups or schedule configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStorage = async () => {
    try {
      setIsRefreshing(true);
      const data = await api.fetchBackups();
      setBackups(data);
      showToast(`Storage verified (${data.length} backup archive${data.length === 1 ? '' : 's'} on storage)`);
    } catch (err: any) {
      showToast('Failed to sync storage backups');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOwner) loadBackupsAndSchedule();
  }, [isOwner]);

  if (!isOwner) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">Access Denied</h3>
        <p className="text-xs text-gray-400 mt-1">
          Only Owner users are authorized to configure and run backups.
        </p>
      </div>
    );
  }

  const handleCreateBackup = async () => {
    try {
      setIsBackingUp(true);
      const res = await api.createBackup(selectedStorage, backupType);
      const sizeStr = formatBytes(res.backup?.fileSize || res.backup?.file_size || 0);
      showToast(`Backup created successfully (${backupType === 'database_only' ? 'Database Only' : 'Full Backup'}, ${sizeStr})`);
      await loadBackupsAndSchedule();
    } catch (err: any) {
      showToast(err.message || 'Failed to create backup');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleSaveSchedule = async () => {
    try {
      setIsSavingSchedule(true);
      const res = await api.saveBackupSchedule({
        enabled: scheduleEnabled,
        interval_days: scheduleIntervalDays,
        backup_type: scheduleBackupType,
        storage_provider: scheduleStorage,
        retention_count: scheduleRetention,
      });
      setSchedule(res.schedule);
      showToast(res.message || 'Automated backup schedule saved');
    } catch (err: any) {
      showToast(err.message || 'Failed to save backup schedule');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleRunScheduleNow = async () => {
    try {
      setIsRunningScheduleNow(true);
      const res = await api.runBackupScheduleNow();
      showToast(res.message || 'Scheduled backup executed');
      await loadBackupsAndSchedule();
    } catch (err: any) {
      showToast(err.message || 'Failed to run scheduled backup');
    } finally {
      setIsRunningScheduleNow(false);
    }
  };

  const handleVerifyBackup = async (id: string) => {
    try {
      setIsVerifyingId(id);
      const res = await api.verifyBackup(id);
      showToast(`Backup verified: SHA-256 matches (${res.valid !== false ? 'VALID' : 'INVALID'})`);
      await loadBackupsAndSchedule();
    } catch (err: any) {
      showToast(err.message || 'Backup verification failed');
    } finally {
      setIsVerifyingId(null);
    }
  };

  const handleRestoreBackup = (backup: BackupRecord) => {
    const isDbOnly = backup.backup_type === 'database_only' || backup.includes_attachments === false;
    openConfirmDialog({
      title: isDbOnly ? 'Restore Database' : 'Restore Database & Attachments',
      message: `Restoring "${backup.filename}" will replace current notes, tags, and data with the backup state. Do you wish to proceed?`,
      confirmText: 'Restore Backup',
      isDestructive: true,
      onConfirm: async () => {
        setIsRestoringId(backup.id);
        try {
          const res = await api.restoreBackup(backup.id, !isDbOnly);
          showToast(res.message || 'Backup restored successfully');
          await loadNotes();
          await loadTags();
        } catch (err: any) {
          showToast(err.message || 'Failed to restore backup');
        } finally {
          setIsRestoringId(null);
        }
      },
    });
  };

  const handleUploadRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    openConfirmDialog({
      title: 'Restore Uploaded Backup',
      message: `Restoring "${file.name}" will overwrite existing database records with the backup state. Proceed?`,
      confirmText: 'Upload & Restore',
      isDestructive: true,
      onConfirm: async () => {
        setIsUploading(true);
        try {
          const res = await api.uploadAndRestoreBackup(file, true);
          showToast(res.message || 'Uploaded backup restored successfully');
          await loadNotes();
          await loadTags();
          await loadBackupsAndSchedule();
        } catch (err: any) {
          showToast(err.message || 'Failed to restore uploaded backup');
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
    });
  };

  const handleDeleteBackup = (id: string) => {
    openConfirmDialog({
      title: 'Delete Backup',
      message: 'Are you sure you want to delete this backup archive from storage? This action cannot be undone.',
      confirmText: 'Delete Backup',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.deleteBackup(id);
          showToast('Backup deleted from storage');
          await loadBackupsAndSchedule();
        } catch (err: any) {
          showToast(err.message || 'Failed to delete backup');
        }
      },
    });
  };

  const handleDownloadBackup = async (e: React.MouseEvent, b: BackupRecord) => {
    e.preventDefault();
    try {
      showToast(`Downloading ${b.filename}...`);
      await api.downloadBackupFile(b.id, b.filename);
    } catch (err: any) {
      showToast(err.message || 'Failed to download backup');
    }
  };

  const handleCopyChecksum = (id: string, checksum: string) => {
    navigator.clipboard.writeText(checksum);
    setCopiedChecksumId(id);
    showToast('SHA-256 checksum copied');
    setTimeout(() => setCopiedChecksumId(null), 2500);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 1. On-Demand Backup Creator Card */}
      <div className="p-5 rounded-xl border border-gray-200/80 dark:border-[#3c4043] bg-white dark:bg-[#252629] space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                Create On-Demand Backup
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Generate an immediate snapshot and save it to your selected destination.
              </p>
            </div>
          </div>
        </div>

        {/* Scope: Database Only vs Full Backup */}
        <div className="space-y-2 pt-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            Archive Scope
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setBackupType('database_only')}
              className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                backupType === 'database_only'
                  ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-gray-900 dark:text-white ring-1 ring-amber-500'
                  : 'border-gray-200 dark:border-[#3c4043] bg-gray-50/50 dark:bg-[#1f2023] text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-[#2a2b2f]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 font-semibold text-xs text-gray-900 dark:text-gray-100">
                  <Database className="w-4 h-4 text-amber-500" />
                  <span>Database Snapshot (Fast)</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  ~1s
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                Backs up notes, checklists, nested tags, accounts, and cloud attachment pointers.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setBackupType('full')}
              className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                backupType === 'full'
                  ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-gray-900 dark:text-white ring-1 ring-amber-500'
                  : 'border-gray-200 dark:border-[#3c4043] bg-gray-50/50 dark:bg-[#1f2023] text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-[#2a2b2f]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 font-semibold text-xs text-gray-900 dark:text-gray-100">
                  <Layers className="w-4 h-4 text-amber-500" />
                  <span>Full Archive (Database + Media)</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  Complete
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                Bundles database records with all locally stored image files, documents, and thumbnails.
              </p>
            </button>
          </div>
        </div>

        {/* Destination Storage Provider */}
        <div className="space-y-2 pt-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            Storage Destination
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedStorage('local')}
              className={`h-10 px-3.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                selectedStorage === 'local'
                  ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-gray-900 dark:text-white ring-1 ring-amber-500'
                  : 'border-gray-200 dark:border-[#3c4043] bg-gray-50/50 dark:bg-[#1f2023] text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-[#2a2b2f]'
              }`}
            >
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="text-xs font-medium">Local Disk</span>
              </div>
              <code className="text-[10px] text-gray-400 font-mono">./backups</code>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStorage('s3')}
              className={`h-10 px-3.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                selectedStorage === 's3'
                  ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-gray-900 dark:text-white ring-1 ring-amber-500'
                  : 'border-gray-200 dark:border-[#3c4043] bg-gray-50/50 dark:bg-[#1f2023] text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-[#2a2b2f]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="text-xs font-medium">S3 / R2 / B2</span>
              </div>
              <span className="text-[10px] text-gray-400">Cloud Bucket</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStorage('gdrive')}
              className={`h-10 px-3.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                selectedStorage === 'gdrive'
                  ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-gray-900 dark:text-white ring-1 ring-amber-500'
                  : 'border-gray-200 dark:border-[#3c4043] bg-gray-50/50 dark:bg-[#1f2023] text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-[#2a2b2f]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-purple-500 flex-shrink-0" />
                <span className="text-xs font-medium">Google Drive</span>
              </div>
              <span className="text-[10px] text-gray-400">Cloud Drive</span>
            </button>
          </div>
        </div>

        {/* Footer info & trigger button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-[#3c4043]">
          <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <span>Includes automated SHA-256 integrity verification upon creation.</span>
          </div>

          <button
            type="button"
            disabled={isBackingUp}
            onClick={handleCreateBackup}
            className="h-9 px-4 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white rounded-lg text-xs font-medium shadow-xs transition-all flex items-center gap-2 cursor-pointer self-stretch sm:self-auto justify-center disabled:opacity-60"
          >
            {isBackingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            <span>{isBackingUp ? 'Generating Snapshot...' : 'Run Backup Now'}</span>
          </button>
        </div>
      </div>

      {/* 2. Automated Scheduled Backups Card */}
      <div className="p-5 rounded-xl border border-gray-200/80 dark:border-[#3c4043] bg-white dark:bg-[#252629] space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                Automated Scheduled Backups
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Background recurring snapshots with automated retention pruning.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer gap-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {scheduleEnabled ? 'Active' : 'Disabled'}
            </span>
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[18px] peer-checked:after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-amber-600"></div>
          </label>
        </div>

        {/* 4 Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Frequency
            </label>
            <select
              value={scheduleIntervalDays}
              onChange={(e) => setScheduleIntervalDays(parseInt(e.target.value, 10))}
              className="w-full h-9 px-3 bg-gray-50/70 dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] rounded-lg text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all cursor-pointer"
            >
              <option value={1}>Daily (Every 24h)</option>
              <option value={2}>Every 2 days</option>
              <option value={3}>Every 3 days</option>
              <option value={7}>Weekly (Every 7 days)</option>
              <option value={14}>Bi-weekly (Every 14 days)</option>
              <option value={30}>Monthly (Every 30 days)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Snapshot Type
            </label>
            <select
              value={scheduleBackupType}
              onChange={(e) => setScheduleBackupType(e.target.value as any)}
              className="w-full h-9 px-3 bg-gray-50/70 dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] rounded-lg text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all cursor-pointer"
            >
              <option value="database_only">Database Snapshot</option>
              <option value="full">Full Archive (DB + Media)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Storage Destination
            </label>
            <select
              value={scheduleStorage}
              onChange={(e) => setScheduleStorage(e.target.value as any)}
              className="w-full h-9 px-3 bg-gray-50/70 dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] rounded-lg text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all cursor-pointer"
            >
              <option value="local">Local Disk (./backups)</option>
              <option value="s3">S3 / R2 / B2 Cloud</option>
              <option value="gdrive">Google Drive</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Retention Limit
            </label>
            <select
              value={scheduleRetention}
              onChange={(e) => setScheduleRetention(parseInt(e.target.value, 10))}
              className="w-full h-9 px-3 bg-gray-50/70 dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] rounded-lg text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all cursor-pointer"
            >
              <option value={3}>Keep last 3 archives</option>
              <option value={7}>Keep last 7 archives</option>
              <option value={14}>Keep last 14 archives</option>
              <option value={30}>Keep last 30 archives</option>
              <option value={0}>Keep all (No pruning)</option>
            </select>
          </div>
        </div>

        {/* Schedule Timing & Actions Bar */}
        {schedule && (
          <div className="p-3 bg-gray-50/70 dark:bg-[#1f2023] rounded-lg border border-gray-200/70 dark:border-[#3c4043] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-300">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  <strong>Next Scheduled Run:</strong>{' '}
                  {schedule.enabled && schedule.next_run_at
                    ? new Date(schedule.next_run_at).toLocaleString()
                    : 'Disabled'}
                </span>
              </div>
              {schedule.last_run_at && (
                <div className="text-[11px] text-gray-400">
                  Last Executed: {new Date(schedule.last_run_at).toLocaleString()} (Status: {schedule.last_status || 'ok'})
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={isRunningScheduleNow}
              onClick={handleRunScheduleNow}
              className="h-8 px-3 rounded-lg bg-white dark:bg-[#28292c] border border-gray-200 dark:border-[#3c4043] hover:bg-gray-50 dark:hover:bg-[#323438] text-gray-700 dark:text-gray-200 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
            >
              {isRunningScheduleNow ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-amber-500" />}
              <span>Run Schedule Now</span>
            </button>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            disabled={isSavingSchedule}
            onClick={handleSaveSchedule}
            className="h-9 px-4 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white rounded-lg text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {isSavingSchedule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Schedule</span>
          </button>
        </div>
      </div>

      {/* 3. External Archive Upload / Restore Card */}
      <div className="p-4 sm:p-5 rounded-xl border border-gray-200/80 dark:border-[#3c4043] bg-white dark:bg-[#252629] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
              Restore from External Archive
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Upload any previously generated QuickNotes backup <code className="font-mono text-[11px]">.zip</code> file to restore notes and settings.
          </p>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            accept=".zip"
            onChange={handleUploadRestore}
            className="hidden"
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="h-9 px-4 bg-white dark:bg-[#28292c] hover:bg-gray-50 dark:hover:bg-[#323438] border border-gray-200 dark:border-[#3c4043] text-gray-800 dark:text-gray-200 rounded-lg text-xs font-medium shadow-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5 text-blue-500" />}
            <span>{isUploading ? 'Restoring Archive...' : 'Upload & Restore (.zip)'}</span>
          </button>
        </div>
      </div>

      {/* 4. Backup History / Storage-Verified Backups Table */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
              Verified Backups on Storage
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-[#1f2023] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#3c4043]">
              {backups.length}
            </span>
          </div>

          <button
            type="button"
            disabled={isRefreshing}
            onClick={handleRefreshStorage}
            title="Scan physical storage and re-verify archives"
            className="h-8 px-3 rounded-lg bg-gray-100 hover:bg-gray-200/80 dark:bg-[#28292c] dark:hover:bg-[#323438] text-gray-600 dark:text-gray-300 text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
            <span>Verify Storage</span>
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400 text-xs font-medium animate-pulse flex flex-col items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            <span>Verifying storage archives...</span>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-gray-200 dark:border-[#3c4043] rounded-xl bg-gray-50/50 dark:bg-[#1f2023]/40 space-y-2">
            <Archive className="w-8 h-8 text-gray-400 mx-auto" />
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
              No backups currently found on physical storage
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 max-w-sm mx-auto">
              Any deleted or missing archives have been pruned. Use <strong>Run Backup Now</strong> above to generate a fresh verified snapshot.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#252629] rounded-xl border border-gray-200/80 dark:border-[#3c4043] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-[680px] w-full text-left text-xs">
                <thead className="bg-gray-50/70 dark:bg-[#1f2023] border-b border-gray-200/80 dark:border-[#3c4043] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Archive File</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Storage</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Checksum</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#3c4043]">
                  {backups.map((b) => {
                    const isDbOnly = b.backup_type === 'database_only' || b.includes_attachments === false;
                    const shortSha = b.checksum_sha256 ? `${b.checksum_sha256.substring(0, 8)}...` : 'N/A';
                    return (
                      <tr key={b.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3.5">
                          <a
                            href={api.getBackupDownloadUrl(b.id)}
                            download={b.filename}
                            onClick={(e) => handleDownloadBackup(e, b)}
                            title={`Download ${b.filename}`}
                            className="inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-gray-100 hover:text-amber-600 dark:hover:text-amber-400 font-mono text-xs cursor-pointer group"
                          >
                            <Download className="w-3.5 h-3.5 text-gray-400 group-hover:text-amber-500 group-hover:translate-y-0.5 transition-all flex-shrink-0" />
                            <span className="truncate max-w-[200px]">{b.filename}</span>
                          </a>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                              isDbOnly
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60'
                            }`}
                          >
                            {isDbOnly ? <Database className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                            <span>{isDbOnly ? 'Database' : 'Full Snapshot'}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="uppercase text-[10px] font-mono font-semibold text-gray-600 dark:text-gray-300">
                            {b.storage_provider}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-gray-600 dark:text-gray-300 text-[11px]">
                          {formatBytes(b.file_size)}
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => handleCopyChecksum(b.id, b.checksum_sha256)}
                            title="Click to copy full SHA-256 checksum"
                            className="inline-flex items-center gap-1 font-mono text-[10px] text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#1a1b1e] border border-gray-200/60 dark:border-[#3c4043] cursor-pointer transition-colors"
                          >
                            {copiedChecksumId === b.id ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{shortSha}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 text-[11px]">
                          {new Date(b.created_at).toLocaleDateString()} {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              disabled={isVerifyingId === b.id}
                              onClick={() => handleVerifyBackup(b.id)}
                              title="Re-verify checksum integrity"
                              className="w-7 h-7 rounded-md text-gray-400 hover:text-emerald-500 hover:bg-gray-100 dark:hover:bg-[#35363a] transition-colors flex items-center justify-center cursor-pointer"
                            >
                              {isVerifyingId === b.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                              ) : (
                                <ShieldCheck className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDownloadBackup(e, b)}
                              title={`Download ${b.filename}`}
                              className="w-7 h-7 rounded-md text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-[#35363a] transition-colors flex items-center justify-center cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              disabled={isRestoringId === b.id}
                              onClick={() => handleRestoreBackup(b)}
                              title="Restore from this backup"
                              className="w-7 h-7 rounded-md text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-[#35363a] transition-colors flex items-center justify-center cursor-pointer"
                            >
                              {isRestoringId === b.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteBackup(b.id)}
                              title="Delete backup archive"
                              className="w-7 h-7 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupSettings;

