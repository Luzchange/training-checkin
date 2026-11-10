/**
 * Local Storage and Session Lifecycle Manager
 *
 * Rules:
 * - Default: In-memory only. No automatic persistence.
 * - Explicit opt-in required: "Save this session on this device".
 * - Store only approved minimum fields (no raw barcodes, no EDIPI, no SSN).
 * - Retention hours configurable (default 24h).
 * - Automatic purge of expired sessions on application startup.
 * - Clear all and delete session support.
 */

import { Attendee, SavedSessionState, StorageConfig, TrainingSession } from '../types';

const STORAGE_KEY_SESSION = 'training_checkin_session_state';
const STORAGE_KEY_CONFIG = 'training_checkin_storage_config';

export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  persistenceEnabled: false,
  retentionHours: 24,
};

/**
 * Get current persistence configuration
 */
export function getStorageConfig(): StorageConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!raw) return DEFAULT_STORAGE_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      persistenceEnabled: Boolean(parsed.persistenceEnabled),
      retentionHours: Number(parsed.retentionHours) || 24,
      lastSavedAt: parsed.lastSavedAt,
    };
  } catch {
    return DEFAULT_STORAGE_CONFIG;
  }
}

/**
 * Save persistence configuration
 */
export function setStorageConfig(config: StorageConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    if (!config.persistenceEnabled) {
      // If user disables persistence, immediately purge saved session data
      clearSavedSession();
    }
  } catch (err) {
    console.error('Failed to update storage configuration', err);
  }
}

/**
 * Load saved session if opt-in is enabled and not expired.
 * Automatically deletes expired records.
 */
export function loadSavedSessionOnStartup(): SavedSessionState | null {
  try {
    const config = getStorageConfig();
    if (!config.persistenceEnabled) {
      return null;
    }

    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (!raw) return null;

    const data: SavedSessionState = JSON.parse(raw);
    const now = new Date().getTime();
    const expiresAt = new Date(data.expiresAt).getTime();

    // Check expiration
    if (isNaN(expiresAt) || now > expiresAt) {
      // Expired! Purge now.
      clearSavedSession();
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error loading saved session state', err);
    clearSavedSession();
    return null;
  }
}

/**
 * Save session state to localStorage if user explicitly opted in.
 */
export function saveSessionState(session: TrainingSession, attendees: Attendee[]): boolean {
  try {
    const config = getStorageConfig();
    if (!config.persistenceEnabled) {
      return false;
    }

    const now = new Date();
    const expires = new Date(now.getTime() + config.retentionHours * 60 * 60 * 1000);

    const state: SavedSessionState = {
      session,
      attendees,
      savedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };

    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(state));

    config.lastSavedAt = state.savedAt;
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    return true;
  } catch (err) {
    console.error('Failed to save session state to localStorage', err);
    return false;
  }
}

/**
 * Delete saved session records
 */
export function clearSavedSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  } catch (err) {
    console.error('Failed to clear saved session', err);
  }
}

/**
 * Clear all local attendance data and reset preferences
 */
export function clearAllLocalAttendanceData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_SESSION);
    localStorage.removeItem(STORAGE_KEY_CONFIG);
  } catch (err) {
    console.error('Failed to clear all local attendance data', err);
  }
}

