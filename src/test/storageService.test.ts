import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStorageConfig,
  setStorageConfig,
  saveSessionState,
  loadSavedSessionOnStartup,
  clearSavedSession,
  clearAllLocalAttendanceData,
} from '../services/storageService';
import { TrainingSession, Attendee, StorageConfig } from '../types';

describe('Storage Service and Session Lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockSession: TrainingSession = {
    id: 'test-session-123',
    title: 'Leadership Seminar',
    date: '2026-11-09',
    createdAt: new Date().toISOString(),
    exportFields: { includeUnit: false },
  };

  const mockAttendees: Attendee[] = [
    {
      id: 'att-1',
      sessionId: 'test-session-123',
      displayName: 'MILLER, ALEX',
      timestamp: new Date().toISOString(),
      entryMethod: 'manual',
    },
  ];

  it('defaults to memory-only storage (persistence disabled)', () => {
    const config = getStorageConfig();
    expect(config.persistenceEnabled).toBe(false);
    expect(config.retentionHours).toBe(24);

    // Saving when disabled returns false and does not store session
    const saved = saveSessionState(mockSession, mockAttendees);
    expect(saved).toBe(false);
    expect(loadSavedSessionOnStartup()).toBeNull();
  });

  it('stores session state only when explicit opt-in is enabled', () => {
    const optInConfig: StorageConfig = {
      persistenceEnabled: true,
      retentionHours: 24,
    };
    setStorageConfig(optInConfig);

    const saved = saveSessionState(mockSession, mockAttendees);
    expect(saved).toBe(true);

    const loaded = loadSavedSessionOnStartup();
    expect(loaded).not.toBeNull();
    expect(loaded?.session.title).toBe('Leadership Seminar');
    expect(loaded?.attendees.length).toBe(1);
    expect(loaded?.attendees[0].displayName).toBe('MILLER, ALEX');
  });

  it('automatically purges expired records on startup', () => {
    setStorageConfig({ persistenceEnabled: true, retentionHours: 1 });

    // Store state with past expiration timestamp
    const expiredState = {
      session: mockSession,
      attendees: mockAttendees,
      savedAt: new Date(Date.now() - 5000000).toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString(), // expired 1s ago
    };
    localStorage.setItem('training_checkin_session_state', JSON.stringify(expiredState));

    // When app starts up and tries to load, expired record is wiped
    const result = loadSavedSessionOnStartup();
    expect(result).toBeNull();
    expect(localStorage.getItem('training_checkin_session_state')).toBeNull();
  });

  it('clears saved session data on explicit deletion', () => {
    setStorageConfig({ persistenceEnabled: true, retentionHours: 24 });
    saveSessionState(mockSession, mockAttendees);
    expect(loadSavedSessionOnStartup()).not.toBeNull();

    clearSavedSession();
    expect(loadSavedSessionOnStartup()).toBeNull();
  });

  it('resets all configurations on clearAllLocalAttendanceData', () => {
    setStorageConfig({ persistenceEnabled: true, retentionHours: 72 });
    saveSessionState(mockSession, mockAttendees);

    clearAllLocalAttendanceData();
    expect(localStorage.getItem('training_checkin_session_state')).toBeNull();
    expect(localStorage.getItem('training_checkin_storage_config')).toBeNull();
    expect(getStorageConfig().persistenceEnabled).toBe(false);
  });
});

