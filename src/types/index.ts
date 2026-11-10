/**
 * Core type definitions for Training Check-In
 * Strictly enforces minimum attendee data retention.
 */

export type EntryMethod = 'scan' | 'manual' | 'synthetic_demo';

export interface Attendee {
  id: string; // Application-generated unique ID (UUID v4)
  sessionId: string; // Application-generated session ID
  displayName: string; // Sanitized full name (e.g., "DOE, JOHN A")
  timestamp: string; // ISO 8601 string with timezone offset
  entryMethod: EntryMethod;
  unit?: string; // Optional unit/organization (only retained if enabled and provided)
}

export interface TrainingSession {
  id: string; // UUID v4 session ID
  title: string; // Required training title
  date: string; // Required ISO date string (YYYY-MM-DD)
  startTime?: string; // Optional (HH:mm)
  instructor?: string; // Optional
  location?: string; // Optional
  createdAt: string; // ISO 8601
  exportFields: {
    includeUnit: boolean;
  };
}

export type ParseStatus = 'success' | 'unsupported' | 'malformed' | 'oversized';

export interface BarcodeParseResult {
  status: ParseStatus;
  displayName?: string;
  unit?: string;
  rawSymbology?: string;
  errorMessage?: string;
  uncertaintyWarning?: string;
  isSynthetic?: boolean;
}

export interface StorageConfig {
  persistenceEnabled: boolean;
  retentionHours: number; // e.g. 24, 72, 168 (7 days)
  lastSavedAt?: string;
}

export interface SavedSessionState {
  session: TrainingSession;
  attendees: Attendee[];
  savedAt: string;
  expiresAt: string;
}

export interface ScanFeedbackOptions {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

