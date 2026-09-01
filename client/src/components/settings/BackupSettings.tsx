import React, { useState, useEffect, useRef } from 'react';
import {
  Archive,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
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
} from 'lucide-react';
import { BackupRecord, BackupScheduleConfig } from '../../types';
import * as api from '../../api/client';
import { useNotes } from '../../context/NotesContext';

export const BackupSettings: React.FC = () => {
  const { isOwner, showToast, loadNotes, loadTags, openConfirmDialog } = useNotes();
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);

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
      loadBackupsAndSchedule();
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
      loadBackupsAndSchedule();
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
      loadBackupsAndSchedule();
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
          loadBackupsAndSchedule();
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
      message: 'Are you sure you want to delete this backup archive? This action cannot be undone.',
      confirmText: 'Delete Backup',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.deleteBackup(id);
          showToast('Backup deleted');
          loadBackupsAndSchedule();
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

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="pb-4 border-b border-gray-100 dark:border-[#3c4043]">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Archive className="w-5 h-5 text-amber-500" />
          Backups & Disaster Recovery
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Create on-demand snapshots, schedule automated recurring backups, and restore database records.
        </p>
      </div>

      {/* 1. On-Demand Backup Creator Card */}
      <div className="p-5 rounded-[6px] border border-gray-200 dark:border-[#3c4043] bg-white dark:bg-[#28292c] space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
            Create On-Demand Backup
          </h3>
        </div>

        {/* Scope: Database Only vs Full Backup */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
            Backup Scope
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <button
              type="button"
              onClick={() => setBackupType('database_only')}
              className={`p-3.5 rounded-[6px] border text-left transition-all cursor-pointer ${
                backupType === 'database_only'
                  ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-400/20'
                  : 'border-gray-200 dark:border-[#3c4043] bg-gray-50 dark:bg-[#1a1b1e] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#323438]'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5 mb-1 text-emerald-700 dark:text-emerald-300 text-xs">
                <Database className="w-4 h-4" />
                <span>⚡ Database Only (Fast)</span>
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                Instant snapshot (~1s). Exports notes, checklists, tags, users, and cloud attachment pointers.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setBackupType('full')}
              className={`p-3.5 rounded-[6px] border text-left transition-all cursor-pointer ${
                backupType === 'full'
                  ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 ring-2 ring-amber-400/20'
                  : 'border-gray-200 dark:border-[#3c4043] bg-gray-50 dark:bg-[#1a1b1e] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#323438]'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-700 dark:text-amber-300 text-xs">
                <Layers className="w-4 h-4" />
                <span>📦 Full Snapshot (DB + Files)</span>
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                Complete archive bundling the full database plus all local images, documents, and thumbnails.
              </div>
            </button>
          </div>
        </div>

        {/* Destination Storage Provider */}
        <div className="space-y-2 pt-1">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
            Storage Destination
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <button
              type="button"
              onClick={() => setSelectedStorage('local')}
              className={`p-3.5 rounded-[6px] border text-left transition-all cursor-pointer ${
                selectedStorage === 'local'
                  ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400/20'
                  : 'border-gray-200 dark:border-[#3c4043] bg-gray-50 dark:bg-[#1a1b1e] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#323438]'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5 mb-0.5 text-xs text-gray-900 dark:text-gray-100">
                <HardDrive className="w-4 h-4 text-amber-500" />
                Local Disk
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                Saved to <code className="font-mono text-[10px]">./backups</code>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStorage('s3')}
              className={`p-3.5 rounded-[6px] border text-left transition-all cursor-pointer ${
                selectedStorage === 's3'
                  ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-400/20'
                  : 'border-gray-200 dark:border-[#3c4043] bg-gray-50 dark:bg-[#1a1b1e] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#323438]'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5 mb-0.5 text-xs text-gray-900 dark:text-gray-100">
                <Cloud className="w-4 h-4 text-blue-500" />
                S3 / R2 / B2
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                Uploaded to S3 bucket
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStorage('gdrive')}
              className={`p-3.5 rounded-[6px] border text-left transition-all cursor-pointer ${
                selectedStorage === 'gdrive'
                  ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 ring-2 ring-purple-400/20'
                  : 'border-gray-200 dark:border-[#3c4043] bg-gray-50 dark:bg-[#1a1b1e] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#323438]'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5 mb-0.5 text-xs text-gray-900 dark:text-gray-100">
                <Cloud className="w-4 h-4 text-purple-500" />
                Google Drive
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                Uploaded to Google Drive
              </div>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-[#3c4043]">
          <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>Includes automated SHA-256 checksum integrity verification.</span>
          </div>

          <button
            type="button"
            disabled={isBackingUp}
            onClick={handleCreateBackup}
            className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-[6px] text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer self-stretch sm:self-auto justify-center"
          >
            {isBackingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>{isBackingUp ? 'Creating & Verifying...' : 'Run Backup Now'}</span>
          </button>
        </div>
      </div>

      {/* 2. Automated Scheduled Backups Card */}
      <div className="p-5 rounded-[6px] border border-gray-200 dark:border-[#3c4043] bg-white dark:bg-[#28292c] space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
              Automated Scheduled Backups
            </h3>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-[6px] peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-[6px] after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500"></div>
            <span className="ml-2 text-xs font-bold text-gray-700 dark:text-gray-300">
              {scheduleEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Automatically generate backups on a recurring schedule in the background with automated retention pruning.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-1">
          {/* Interval */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Backup Frequency
            </label>
            <select
              value={scheduleIntervalDays}
              onChange={(e) => setScheduleIntervalDays(parseInt(e.target.value, 10))}
              className="w-full h-10 px-3 bg-gray-50 dark:bg-[#1a1b1e] border border-gray-200 dark:border-[#3c4043] rounded-[6px] text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all cursor-pointer"
            >
              <option value={1}>Daily (Every 1 day)</option>
              <option value={2}>Every 2 days</option>
              <option value={3}>Every 3 days</option>
              <option value={4}>Every 4 days</option>
              <option value={5}>Every 5 days</option>
              <option value={6}>Every 6 days</option>
              <option value={7}>Weekly (Every 7 days)</option>
              <option value={14}>Every 14 days</option>
              <option value={30}>Monthly (Every 30 days)</option>
            </select>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Scheduled Type
            </label>
            <select
              value={scheduleBackupType}
              onChange={(e) => setScheduleBackupType(e.target.value as any)}
              className="w-full h-10 px-3 bg-gray-50 dark:bg-[#1a1b1e] border border-gray-200 dark:border-[#3c4043] rounded-[6px] text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all cursor-pointer"
            >
              <option value="database_only">⚡ Database Only</option>
              <option value="full">📦 Full (DB + Files)</option>
            </select>
          </div>

          {/* Storage */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Destination
            </label>
            <select
              value={scheduleStorage}
              onChange={(e) => setScheduleStorage(e.target.value as any)}
              className="w-full h-10 px-3 bg-gray-50 dark:bg-[#1a1b1e] border border-gray-200 dark:border-[#3c4043] rounded-[6px] text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all cursor-pointer"
            >
              <option value="local">Local Disk</option>
              <option value="s3">S3 / R2 / B2</option>
              <option value="gdrive">Google Drive</option>
            </select>
          </div>

          {/* Retention */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Retention Limit
            </label>
            <select
              value={scheduleRetention}
              onChange={(e) => setScheduleRetention(parseInt(e.target.value, 10))}
              className="w-full h-10 px-3 bg-gray-50 dark:bg-[#1a1b1e] border border-gray-200 dark:border-[#3c4043] rounded-[6px] text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all cursor-pointer"
            >
              <option value={3}>Keep last 3 backups</option>
              <option value={7}>Keep last 7 backups</option>
              <option value={14}>Keep last 14 backups</option>
              <option value={30}>Keep last 30 backups</option>
              <option value={0}>Keep all (No pruning)</option>
            </select>
          </div>
        </div>

        {/* Schedule Timing & Status Bar */}
        {schedule && (
          <div className="p-3.5 bg-gray-50 dark:bg-[#1a1b1e] rounded-[6px] border border-gray-200/80 dark:border-[#3c4043] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-300">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  <strong>Next Run:</strong>{' '}
                  {schedule.enabled && schedule.next_run_at
                    ? new Date(schedule.next_run_at).toLocaleString()
                    : 'Disabled'}
                </span>
              </div>
              {schedule.last_run_at && (
                <div className="text-[11px] text-gray-400">
                  Last Ran: {new Date(schedule.last_run_at).toLocaleString()} (Status: {schedule.last_status || 'ok'})
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={isRunningScheduleNow}
              onClick={handleRunScheduleNow}
              title="Execute scheduled backup right now"
              className="h-8 px-3 rounded-[6px] bg-white dark:bg-[#28292c] border border-gray-200 dark:border-[#3c4043] hover:bg-gray-50 dark:hover:bg-[#323438] text-gray-700 dark:text-gray-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isRunningScheduleNow ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 text-amber-500" />}
              <span>Run Schedule Now</span>
            </button>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            disabled={isSavingSchedule}
            onClick={handleSaveSchedule}
            className="h-10 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-[6px] text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {isSavingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Schedule Settings</span>
          </button>
        </div>
      </div>

      {/* 3. Restore from External File */}
      <div className="p-5 rounded-[6px] border border-gray-200 dark:border-[#3c4043] bg-white dark:bg-[#28292c] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
              Restore from External Archive File
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Upload any previously generated QuickNotes backup <code className="font-mono text-[11px]">.zip</code> file to restore data state.
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
            className="h-10 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-[6px] text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            <span>{isUploading ? 'Restoring Archive...' : 'Upload & Restore (.zip)'}</span>
          </button>
        </div>
      </div>

      {/* 4. Backup History Table */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Archive className="w-4 h-4 text-amber-500" />
          <span>Backup History ({backups.length})</span>
        </h3>

        {loading ? (
          <div className="py-8 text-center text-gray-400 text-xs font-medium animate-pulse">Loading backups...</div>
        ) : backups.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-[#3c4043] rounded-[6px]">
            <Archive className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-400 font-medium">No backups generated yet.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#28292c] rounded-[6px] border border-gray-200 dark:border-[#3c4043] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full text-left text-xs">
                <thead className="bg-gray-50/80 dark:bg-[#202124] border-b border-gray-200 dark:border-[#3c4043] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">Backup File</th>
                    <th className="px-5 py-3.5">Scope</th>
                    <th className="px-5 py-3.5">Storage</th>
                    <th className="px-5 py-3.5">Size</th>
                    <th className="px-5 py-3.5">Integrity</th>
                    <th className="px-5 py-3.5">Created</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#3c4043]">
                  {backups.map((b) => {
                    const isDbOnly = b.backup_type === 'database_only' || b.includes_attachments === false;
                    return (
                      <tr key={b.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4">
                          <a
                            href={api.getBackupDownloadUrl(b.id)}
                            download={b.filename}
                            onClick={(e) => handleDownloadBackup(e, b)}
                            title={`Download ${b.filename}`}
                            className="inline-flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs cursor-pointer group"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-500 group-hover:translate-y-0.5 transition-transform flex-shrink-0" />
                            <span>{b.filename}</span>
                          </a>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5 truncate max-w-xs">
                            SHA256: {b.checksum_sha256}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isDbOnly
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            }`}
                          >
                            {isDbOnly ? <Database className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                            <span>{isDbOnly ? 'Database Only' : 'Full Snapshot'}</span>
                          </span>
                        </td>
                        <td className="px-5 py-4 uppercase font-bold text-[11px] text-gray-600 dark:text-gray-300 font-mono">
                          {b.storage_provider}
                        </td>
                        <td className="px-5 py-4 font-mono text-gray-500 dark:text-gray-400 text-[11px]">
                          {formatBytes(b.file_size)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              b.is_verified
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            }`}
                          >
                            {b.is_verified ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            <span>{b.is_verified ? 'Verified' : 'Unverified'}</span>
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-500 dark:text-gray-400 text-[11px]">
                          {new Date(b.created_at).toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              disabled={isVerifyingId === b.id}
                              onClick={() => handleVerifyBackup(b.id)}
                              title="Re-verify backup checksum"
                              className="w-8 h-8 rounded-[6px] text-gray-400 hover:text-emerald-500 hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors flex items-center justify-center cursor-pointer"
                            >
                              {isVerifyingId === b.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                              ) : (
                                <ShieldCheck className="w-4 h-4" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDownloadBackup(e, b)}
                              title={`Download ${b.filename}`}
                              className="w-8 h-8 rounded-[6px] text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors flex items-center justify-center cursor-pointer"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              disabled={isRestoringId === b.id}
                              onClick={() => handleRestoreBackup(b)}
                              title="Restore from this backup"
                              className="w-8 h-8 rounded-[6px] text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors flex items-center justify-center cursor-pointer"
                            >
                              {isRestoringId === b.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                              ) : (
                                <RotateCcw className="w-4 h-4" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteBackup(b.id)}
                              title="Delete backup"
                              className="w-8 h-8 rounded-[6px] text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
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
