import { describe, it, expect } from 'vitest';
import {
  sanitizeCsvField,
  generateSafeExportFilename,
  buildAttendanceCsv,
} from '../services/csvExport';
import { Attendee, TrainingSession } from '../types';

describe('CSV Export and Formula Injection Defense', () => {
  describe('sanitizeCsvField', () => {
    it('prepends single quote to dangerous formula prefixes (=, +, -, @, tab)', () => {
      expect(sanitizeCsvField('=cmd|/C calc!A0')).toBe("'=cmd|/C calc!A0");
      expect(sanitizeCsvField('+12345')).toBe("'+12345");
      expect(sanitizeCsvField('-SUM(A1:A10)')).toBe("'-SUM(A1:A10)");
      expect(sanitizeCsvField('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
    });

    it('neutralizes formula injection with leading whitespace before formula trigger', () => {
      expect(sanitizeCsvField('   =cmd|/C')).toBe("'   =cmd|/C");
      expect(sanitizeCsvField('\t+500')).toBe("'\t+500");
    });

    it('properly quotes and escapes fields with commas and quotation marks', () => {
      expect(sanitizeCsvField('DOE, JOHN')).toBe('"DOE, JOHN"');
      expect(sanitizeCsvField('He said "Hello"')).toBe('"He said ""Hello"""');
    });

    it('leaves standard text unquoted if no commas or formula triggers exist', () => {
      expect(sanitizeCsvField('Cyber Awareness')).toBe('Cyber Awareness');
    });
  });

  describe('generateSafeExportFilename', () => {
    it('creates filename without attendee personal info', () => {
      const mockSession: TrainingSession = {
        id: '12345678-abcd-ef00-1122-334455667788',
        title: 'Confidential Annual Briefing',
        date: '2026-11-09',
        createdAt: '2026-11-09T08:00:00Z',
        exportFields: { includeUnit: false },
      };

      const filename = generateSafeExportFilename(mockSession, 'csv');
      expect(filename).toBe('training-attendance-2026-11-09-12345678.csv');
      expect(filename).not.toContain('Confidential');
    });
  });

  describe('buildAttendanceCsv', () => {
    it('includes session title, date, timezone-aware timestamp, and correct headers', () => {
      const session: TrainingSession = {
        id: 'sess-uuid-1',
        title: 'Safety Training',
        date: '2026-11-09',
        startTime: '10:00',
        createdAt: '2026-11-09T08:00:00Z',
        exportFields: { includeUnit: true },
      };

      const attendees: Attendee[] = [
        {
          id: 'att-1',
          sessionId: 'sess-uuid-1',
          displayName: 'SMITH, JANE',
          timestamp: '2026-11-09T10:05:00-05:00',
          entryMethod: 'scan',
          unit: 'US Army',
        },
      ];

      const csv = buildAttendanceCsv(session, attendees);
      const lines = csv.split('\r\n');

      expect(lines[0]).toContain('Session Title,Training Date,Start Time,Instructor,Location,Attendee Name,Check-in Timestamp (ISO),Entry Method,Unit / Organization');
      expect(lines[1]).toContain('Safety Training,2026-11-09,10:00,,,"SMITH, JANE",2026-11-09T10:05:00-05:00,scan,US Army');
    });
  });
});

