import React, { useState, useEffect, useCallback } from 'react';
import {
  TrainingSession,
  Attendee,
  BarcodeParseResult,
  ScanFeedbackOptions,
  SavedSessionState,
  StorageConfig,
} from './types';
import {
  getStorageConfig,
  loadSavedSessionOnStartup,
  saveSessionState,
  clearSavedSession,
} from './services/storageService';
import { triggerScanFeedback } from './services/feedbackService';
import { createSyntheticCac89String, parseBarcodePayload } from './services/barcodeParser';
import { WelcomeScreen } from './components/WelcomeScreen';
import { SessionSetup } from './components/SessionSetup';
import { MobileScanner } from './components/MobileScanner';
import { ScanConfirmationModal } from './components/ScanConfirmationModal';
import { ManualEntryModal } from './components/ManualEntryModal';
import { AttendanceList } from './components/AttendanceList';
import { ExportView } from './components/ExportView';
import { PrivacySettingsModal } from './components/PrivacySettingsModal';
import {
  ShieldCheck,
  Moon,
  Sun,
  Users,
  Camera,
  FileDown,
  Settings,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

type ActiveView = 'welcome' | 'setup' | 'scanner' | 'export';

export const App: React.FC = () => {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Current session & attendees
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [savedSessionState, setSavedSessionState] = useState<SavedSessionState | null>(null);
  const [storageConfig, setStorageConfigState] = useState<StorageConfig>(getStorageConfig);

  // Active view navigation
  const [activeView, setActiveView] = useState<ActiveView>('welcome');
  const [subTab, setSubTab] = useState<'scanner' | 'roster'>('scanner');

  // Modals & Popups
  const [pendingScanResult, setPendingScanResult] = useState<BarcodeParseResult | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Feedback options
  const [feedbackOptions, setFeedbackOptions] = useState<ScanFeedbackOptions>({
    soundEnabled: true,
    vibrationEnabled: true,
  });

  // Undo stack
  const [lastAddedAttendeeId, setLastAddedAttendeeId] = useState<string | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Synchronize dark mode class to <html>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // On startup: check expired sessions and load saved session if opted in
  useEffect(() => {
    const saved = loadSavedSessionOnStartup();
    if (saved) {
      setSavedSessionState(saved);
    }
  }, []);

  // Save session state to localStorage if opted in
  useEffect(() => {
    if (session && storageConfig.persistenceEnabled) {
      saveSessionState(session, attendees);
    }
  }, [session, attendees, storageConfig.persistenceEnabled]);

  const showTemporaryBanner = (msg: string) => {
    setBannerNotice(msg);
    setTimeout(() => {
      setBannerNotice((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Handle Session Creation
  const handleSessionCreated = (newSession: TrainingSession) => {
    setSession(newSession);
    setAttendees([]);
    setLastAddedAttendeeId(null);
    setActiveView('scanner');
    setSubTab('scanner');
  };

  // Resume Session from local storage
  const handleResumeSession = (saved: SavedSessionState) => {
    setSession(saved.session);
    setAttendees(saved.attendees);
    setLastAddedAttendeeId(null);
    setActiveView('scanner');
    setSubTab('roster');
    showTemporaryBanner(`Resumed session: ${saved.session.title}`);
  };

  // Launch Synthetic Demo
  const handleTrySyntheticDemo = () => {
    const demoSession: TrainingSession = {
      id: crypto.randomUUID(),
      title: 'Synthetic Demo Event (Cyber Security 101)',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      instructor: 'Dr. Synthetic Instructor',
      location: 'Virtual Classroom A',
      createdAt: new Date().toISOString(),
      exportFields: {
        includeUnit: true,
      },
    };

    const demoAttendees: Attendee[] = [
      {
        id: crypto.randomUUID(),
        sessionId: demoSession.id,
        displayName: 'WASHINGTON, GEORGE A',
        unit: 'US Army',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        entryMethod: 'synthetic_demo',
      },
      {
        id: crypto.randomUUID(),
        sessionId: demoSession.id,
        displayName: 'ADAMS, JOHN Q',
        unit: 'US Navy',
        timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        entryMethod: 'synthetic_demo',
      },
    ];

    setSession(demoSession);
    setAttendees(demoAttendees);
    setLastAddedAttendeeId(demoAttendees[1].id);
    setActiveView('scanner');
    setSubTab('roster');
    showTemporaryBanner('Loaded Synthetic Demo session with 2 sample attendees.');
  };

  // Add Attendee Record
  const handleAddAttendee = useCallback(
    (displayName: string, unit?: string, method: Attendee['entryMethod'] = 'scan') => {
      if (!session) return;

      const newAttendee: Attendee = {
        id: crypto.randomUUID(),
        sessionId: session.id,
        displayName,
        timestamp: new Date().toISOString(),
        entryMethod: method,
        unit: session.exportFields.includeUnit ? unit : undefined,
      };

      setAttendees((prev) => [newAttendee, ...prev]);
      setLastAddedAttendeeId(newAttendee.id);
      triggerScanFeedback('success', feedbackOptions);
      showTemporaryBanner(`Checked in: ${displayName}`);
    },
    [session, feedbackOptions]
  );

  // Barcode scanned event from camera
  const handleBarcodeScanned = (result: BarcodeParseResult) => {
    if (result.status === 'success') {
      // Check for same-name duplicate
      const duplicate = attendees.find(
        (a) => a.displayName.toLowerCase() === (result.displayName || '').toLowerCase()
      );

      if (duplicate) {
        triggerScanFeedback('warning', feedbackOptions);
      }

      setPendingScanResult(result);
    } else {
      // Format not supported or malformed
      triggerScanFeedback('warning', feedbackOptions);
      setPendingScanResult(result);
    }
  };

  // Confirm pending scan
  const handleConfirmScanResult = (displayName: string, unit?: string) => {
    handleAddAttendee(
      displayName,
      unit,
      pendingScanResult?.isSynthetic ? 'synthetic_demo' : 'scan'
    );
    setPendingScanResult(null);
  };

  // Manual Check-In
  const handleManualAdd = (displayName: string, unit?: string) => {
    handleAddAttendee(displayName, unit, 'manual');
  };

  // Update existing attendee
  const handleUpdateAttendee = (id: string, newDisplayName: string, newUnit?: string) => {
    setAttendees((prev) =>
      prev.map((a) => (a.id === id ? { ...a, displayName: newDisplayName, unit: newUnit } : a))
    );
    showTemporaryBanner('Attendee record updated.');
  };

  // Delete attendee
  const handleDeleteAttendee = (id: string) => {
    setAttendees((prev) => prev.filter((a) => a.id !== id));
    showTemporaryBanner('Attendee removed from roster.');
  };

  // Undo last check in
  const handleUndoLastCheckIn = () => {
    if (!lastAddedAttendeeId) return;
    const removed = attendees.find((a) => a.id === lastAddedAttendeeId);
    setAttendees((prev) => prev.filter((a) => a.id !== lastAddedAttendeeId));
    setLastAddedAttendeeId(null);
    if (removed) {
      showTemporaryBanner(`Undid check-in for ${removed.displayName}`);
    }
  };

  // End Session & Clear
  const handleEndAndClearSession = () => {
    clearSavedSession();
    setSession(null);
    setAttendees([]);
    setSavedSessionState(null);
    setActiveView('welcome');
    showTemporaryBanner('Session ended and local data erased.');
  };

  // Helper: Simulate scanning a sample synthetic card (Quick Demo button)
  const handleSimulateQuickScan = () => {
    const demoCards = [
      { first: 'SARAH', last: 'CONNOR', mi: 'T', branch: 'F' },
      { first: 'ALEX', last: 'MERCER', mi: 'J', branch: 'A' },
      { first: 'RILEY', last: 'MILLER', mi: 'D', branch: 'N' },
    ];
    const pick = demoCards[Math.floor(Math.random() * demoCards.length)];
    const synthetic89 = createSyntheticCac89String(pick.first, pick.last, pick.mi, pick.branch);
    const parsed = parseBarcodePayload(synthetic89);
    handleBarcodeScanned({
      ...parsed,
      isSynthetic: true,
      rawSymbology: 'SYNTHETIC_FIXED_89',
      uncertaintyWarning: 'Simulated Synthetic CAC Front Barcode (Demo Only)',
    });
  };

  // Calculate duplicate match for pending scan
  const duplicateMatch = pendingScanResult?.displayName
    ? attendees.find(
        (a) => a.displayName.toLowerCase() === pendingScanResult.displayName!.toLowerCase()
      )
    : undefined;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-md border-b border-border px-4 py-3 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight block">Training Check-In</span>
              {session && (
                <span className="text-[11px] text-muted-foreground truncate block max-w-[180px]">
                  {session.title}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowPrivacyModal(true)}
              title="Privacy & Local Storage Settings"
              aria-label="Open privacy settings"
              className="btn btn-ghost p-2 text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle dark mode"
              className="btn btn-ghost p-2 text-muted-foreground hover:text-foreground"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Temporary Floating Notice Toast */}
      {bannerNotice && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 max-w-sm w-[90%] bg-foreground text-background text-xs py-2 px-3.5 rounded-full shadow-lg flex items-center gap-2 animate-fade-in pointer-events-none">
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
          <span className="truncate">{bannerNotice}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 pb-24">
        {activeView === 'welcome' && (
          <WelcomeScreen
            onCreateSession={() => setActiveView('setup')}
            onResumeSession={handleResumeSession}
            onTrySyntheticDemo={handleTrySyntheticDemo}
            savedSession={savedSessionState}
            onOpenPrivacySettings={() => setShowPrivacyModal(true)}
          />
        )}

        {activeView === 'setup' && (
          <SessionSetup
            onSessionCreated={handleSessionCreated}
            onCancel={() => setActiveView('welcome')}
          />
        )}

        {activeView === 'scanner' && session && (
          <div className="space-y-4">
            {/* Top Sub-tabs (Scanner vs Attendance Roster) */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-muted border border-border">
              <button
                type="button"
                onClick={() => setSubTab('scanner')}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  subTab === 'scanner'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Scanner</span>
              </button>
              <button
                type="button"
                onClick={() => setSubTab('roster')}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  subTab === 'roster'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Roster ({attendees.length})</span>
              </button>
            </div>

            {/* Quick Demo Simulator Pill (When testing on desktop without webcam or cards) */}
            <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-primary/5 border border-primary/20 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Testing without camera?</span>
              </span>
              <button
                type="button"
                onClick={handleSimulateQuickScan}
                className="btn btn-outline text-[11px] py-1 px-2.5 font-medium"
              >
                Simulate Front Scan
              </button>
            </div>

            {/* View Sub-tabs */}
            {subTab === 'scanner' ? (
              <MobileScanner
                onScanResult={handleBarcodeScanned}
                onOpenManualEntry={() => setShowManualModal(true)}
                feedbackOptions={feedbackOptions}
                onToggleFeedback={(type) =>
                  setFeedbackOptions((prev) => ({
                    ...prev,
                    [type === 'sound' ? 'soundEnabled' : 'vibrationEnabled']:
                      !prev[type === 'sound' ? 'soundEnabled' : 'vibrationEnabled'],
                  }))
                }
              />
            ) : (
              <AttendanceList
                attendees={attendees}
                includeUnitField={session.exportFields.includeUnit}
                onUpdateAttendee={handleUpdateAttendee}
                onDeleteAttendee={handleDeleteAttendee}
                onUndoLastCheckIn={handleUndoLastCheckIn}
                canUndo={Boolean(lastAddedAttendeeId)}
              />
            )}
          </div>
        )}

        {activeView === 'export' && session && (
          <ExportView
            session={session}
            attendees={attendees}
            onReturnToSession={() => setActiveView('scanner')}
            onEndAndClearSession={handleEndAndClearSession}
          />
        )}
      </main>

      {/* Bottom Sticky Action Bar (When in an active session) */}
      {session && activeView === 'scanner' && (
        <nav
          aria-label="Session Navigation"
          className="fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur-md border-t border-border p-3 z-20"
        >
          <div className="max-w-md mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="text-xs">
                <span className="font-bold text-foreground text-sm block">
                  {attendees.length} Checked In
                </span>
                <span className="text-muted-foreground text-[11px]">
                  {storageConfig.persistenceEnabled ? 'Saved to device' : 'Memory only'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveView('export')}
              className="btn btn-primary py-2.5 px-4 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <FileDown className="w-4 h-4" />
              <span>Review &amp; Export</span>
            </button>
          </div>
        </nav>
      )}

      {/* Confirmation Modal */}
      {pendingScanResult && session && (
        <ScanConfirmationModal
          result={pendingScanResult}
          isPossibleDuplicate={Boolean(duplicateMatch)}
          existingAttendeeTime={duplicateMatch?.timestamp}
          includeUnitField={session.exportFields.includeUnit}
          onConfirm={handleConfirmScanResult}
          onCancel={() => setPendingScanResult(null)}
        />
      )}

      {/* Manual Entry Modal */}
      {showManualModal && session && (
        <ManualEntryModal
          includeUnitField={session.exportFields.includeUnit}
          onAddAttendee={handleManualAdd}
          onClose={() => setShowManualModal(false)}
        />
      )}

      {/* Privacy Settings Modal */}
      {showPrivacyModal && (
        <PrivacySettingsModal
          currentConfig={storageConfig}
          onConfigUpdated={(cfg) => setStorageConfigState(cfg)}
          onClose={() => setShowPrivacyModal(false)}
        />
      )}
    </div>
  );
};
