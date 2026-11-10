import React from 'react';
import { AlertTriangle, ArrowRight, Play, Database, Info } from 'lucide-react';
import { SavedSessionState } from '../types';

interface WelcomeScreenProps {
  onCreateSession: () => void;
  onResumeSession: (state: SavedSessionState) => void;
  onTrySyntheticDemo: () => void;
  savedSession: SavedSessionState | null;
  onOpenPrivacySettings: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onCreateSession,
  onResumeSession,
  onTrySyntheticDemo,
  savedSession,
  onOpenPrivacySettings,
}) => {
  return (
    <div className="welcome-screen space-y-6">
      {/* Privacy Notice Banner */}
      <div className="banner banner-warning flex items-start gap-3 p-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-sm">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="font-semibold mb-1">Organizational Approval Required</p>
          <p className="leading-relaxed">
            Use only where authorized by your organization. This tool records attendance; it does <strong>not</strong> authenticate a CAC or verify identity.
          </p>
        </div>
      </div>

      <div className="text-center py-4">
        <div className="inline-flex p-3.5 rounded-2xl bg-primary/10 text-primary mb-3 text-4xl shadow-xs">
          🪪
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Training Check-In</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          Fast, privacy-first mobile sign-in roster for mass training events.
        </p>
      </div>

      {/* Main Actions */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={onCreateSession}
          className="btn btn-primary w-full py-4 text-base font-semibold flex items-center justify-between shadow-md"
        >
          <span>Create Training Session</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        {savedSession && (
          <button
            type="button"
            onClick={() => onResumeSession(savedSession)}
            className="btn btn-secondary w-full py-3.5 text-base font-medium flex items-center justify-between border-2 border-primary/20"
          >
            <div className="flex items-center gap-2.5 text-left">
              <Database className="w-5 h-5 text-primary" />
              <div>
                <span className="block font-semibold">{savedSession.session.title}</span>
                <span className="text-xs text-muted-foreground">
                  Saved locally &bull; {savedSession.attendees.length} attendees
                </span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </button>
        )}

        <button
          type="button"
          onClick={onTrySyntheticDemo}
          className="btn btn-outline w-full py-3 text-sm font-medium flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4 text-emerald-600" />
          <span>Try Synthetic Demo (No Real Cards)</span>
        </button>
      </div>

      {/* Privacy Guarantee Card */}
      <div className="p-4 rounded-xl border border-border bg-card text-card-foreground text-xs space-y-2">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Info className="w-4 h-4 text-primary" />
          <span>Device-Only Processing Guarantee</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Camera images and attendance records are processed locally by this app. Exporting or sharing a file sends information outside the app through the destination you choose.
        </p>
        <div className="pt-2 border-t border-border flex justify-between items-center">
          <span className="text-muted-foreground">Default: memory-only storage</span>
          <button
            type="button"
            onClick={onOpenPrivacySettings}
            className="text-primary hover:underline font-medium"
          >
            Privacy &amp; Data Settings
          </button>
        </div>
      </div>
    </div>
  );
};

