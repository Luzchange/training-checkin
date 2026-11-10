import React, { useState } from 'react';
import { StorageConfig } from '../types';
import {
  setStorageConfig,
  clearAllLocalAttendanceData,
} from '../services/storageService';
import {
  ShieldCheck,
  HardDrive,
  Trash2,
  ArrowLeft,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface PrivacySettingsModalProps {
  currentConfig: StorageConfig;
  onConfigUpdated: (config: StorageConfig) => void;
  onClose: () => void;
}

export const PrivacySettingsModal: React.FC<PrivacySettingsModalProps> = ({
  currentConfig,
  onConfigUpdated,
  onClose,
}) => {
  const [persistenceEnabled, setPersistenceEnabled] = useState(
    currentConfig.persistenceEnabled
  );
  const [retentionHours, setRetentionHours] = useState(
    currentConfig.retentionHours || 24
  );
  const [savedNotice, setSavedNotice] = useState(false);
  const [clearedNotice, setClearedNotice] = useState(false);

  const handleSave = () => {
    const nextConfig: StorageConfig = {
      persistenceEnabled,
      retentionHours,
      lastSavedAt: currentConfig.lastSavedAt,
    };
    setStorageConfig(nextConfig);
    onConfigUpdated(nextConfig);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleClearAll = () => {
    if (
      window.confirm(
        'Clear all saved sessions and reset storage preferences on this device?'
      )
    ) {
      clearAllLocalAttendanceData();
      const resetConfig: StorageConfig = {
        persistenceEnabled: false,
        retentionHours: 24,
      };
      setPersistenceEnabled(false);
      onConfigUpdated(resetConfig);
      setClearedNotice(true);
      setTimeout(() => setClearedNotice(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-card border border-border w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-settings-title"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h3 id="privacy-settings-title" className="font-bold text-base text-foreground">
              Privacy &amp; Local Data Settings
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="btn btn-ghost p-1.5 rounded-lg text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {savedNotice && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>Settings saved successfully.</span>
          </div>
        )}

        {clearedNotice && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 rounded-xl text-xs flex items-center gap-2">
            <Trash2 className="w-4 h-4 flex-shrink-0" />
            <span>All local attendance data cleared.</span>
          </div>
        )}

        {/* Core Notice */}
        <div className="p-3.5 rounded-xl bg-muted/60 border border-border text-xs space-y-2 text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground">Default: In-Memory Storage Only</p>
          <p>
            Attendance is not saved automatically. Reloading or closing this page without local persistence enabled will erase your session.
          </p>
          <p>
            <em>
              “Camera images and attendance records are processed locally by this app. Exporting or sharing a file sends information outside the app through the destination you choose.”
            </em>
          </p>
        </div>

        {/* Local Persistence Opt-in */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <span className="font-semibold text-sm text-foreground block mb-0.5">
                  Save this session on this device
                </span>
                <span className="text-xs text-muted-foreground block leading-tight">
                  Stores roster in browser localStorage between page refreshes
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={persistenceEnabled}
              onChange={(e) => setPersistenceEnabled(e.target.checked)}
              className="checkbox w-5 h-5 flex-shrink-0"
            />
          </label>

          {persistenceEnabled && (
            <div className="pt-3 border-t border-border space-y-3">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="retention-select" className="font-medium text-foreground">
                  Automatic retention period:
                </label>
                <select
                  id="retention-select"
                  value={retentionHours}
                  onChange={(e) => setRetentionHours(Number(e.target.value))}
                  className="input py-1 text-xs"
                >
                  <option value={12}>12 Hours</option>
                  <option value={24}>24 Hours (1 Day)</option>
                  <option value={72}>72 Hours (3 Days)</option>
                  <option value={168}>168 Hours (7 Days)</option>
                </select>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Browser local storage is not equivalent to an encrypted, access-controlled enterprise database. Records are checked and purged on application startup.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Clear Data Buttons */}
        <div className="pt-2 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary w-full py-3 text-sm font-semibold"
          >
            Apply Settings
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            className="btn btn-ghost text-xs text-destructive hover:bg-destructive/10 py-2.5"
          >
            Clear All Local Attendance Data
          </button>
        </div>
      </div>
    </div>
  );
};

