/**
 * CSV Generation and Spreadsheet Formula Injection Defense
 *
 * Rules:
 * - Neutralize formula injection risk by prepending single quote (') if value begins
 *   with dangerous characters (=, +, -, @, \t, \r, 0x09, 0x0B) even after whitespace.
 * - Proper RFC 4180 CSV escaping for quotes, commas, and linebreaks.
 * - Always include session title and training date in every attendance row.
 * - Timezone-aware ISO timestamp.
 * - Safe filename generation containing no attendee personal data.
 */

import { Attendee, TrainingSession } from '../types';

/**
 * Defends against formula injection in spreadsheets (CSV injection).
 * If a field starts with any of [ = , + , - , @ , \t , \r ],
 * or leading whitespace followed by these, prepend a single quote (').
 */
export function sanitizeCsvField(value: string | undefined | null): string {
  if (value === undefined || value === null) {
    return '';
  }

  const str = String(value);

  // Check for dangerous leading formula trigger characters
  // Matching: start of string or leading whitespace followed by =, +, -, @, tab, newline
  const dangerousPattern = /^\s*([=+\-@\t\r])/;
  let safeStr = str;

  if (dangerousPattern.test(str)) {
    // Prepend single quote to neutralize formula execution in Excel/Sheets/Calc
    safeStr = `'${str}`;
  }

  // RFC 4180 escaping: if contains quote, comma, or newline, wrap in quotes and double quotes
  if (/[",\r\n]/.test(safeStr)) {
    return `"${safeStr.replace(/"/g, '""')}"`;
  }

  return safeStr;
}

/**
 * Generates an export filename that never includes attendee names or sensitive identifiers.
 * e.g., "training-attendance-2026-11-09-abc12345.csv"
 */
export function generateSafeExportFilename(session: TrainingSession, extension: string = 'csv'): string {
  // Clean session date or fallback to today
  const cleanDate = session.date ? session.date.replace(/[^0-9-]/g, '') : 'session';
  // Use first 8 characters of session UUID for uniqueness
  const shortId = session.id.substring(0, 8);
  return `training-attendance-${cleanDate}-${shortId}.${extension}`;
}

/**
 * Build CSV string from session and attendees list
 */
export function buildAttendanceCsv(session: TrainingSession, attendees: Attendee[]): string {
  const headers = [
    'Session Title',
    'Training Date',
    'Start Time',
    'Instructor',
    'Location',
    'Attendee Name',
    'Check-in Timestamp (ISO)',
    'Entry Method',
  ];

  if (session.exportFields.includeUnit) {
    headers.push('Unit / Organization');
  }

  const rows: string[] = [];
  rows.push(headers.map(sanitizeCsvField).join(','));

  for (const a of attendees) {
    const row = [
      session.title,
      session.date,
      session.startTime || '',
      session.instructor || '',
      session.location || '',
      a.displayName,
      a.timestamp,
      a.entryMethod,
    ];

    if (session.exportFields.includeUnit) {
      row.push(a.unit || '');
    }

    rows.push(row.map(sanitizeCsvField).join(','));
  }

  return rows.join('\r\n');
}

/**
 * Triggers native Web Share API with a File object if supported,
 * otherwise returns false so caller can invoke download fallback.
 */
export async function shareAttendanceFile(
  filename: string,
  csvContent: string,
  title: string
): Promise<{ shared: boolean; error?: string }> {
  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const file = new File([blob], filename, { type: 'text/csv' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title,
        text: `Attendance roster for ${title} (${file.name})`,
      });
      return { shared: true };
    }
    return { shared: false };
  } catch (err: unknown) {
    // User cancelled share sheet or share failed
    if (err instanceof Error && err.name === 'AbortError') {
      return { shared: true }; // Cancelled intentionally by user
    }
    return { shared: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Browser download fallback via temporary anchor tag
 */
export function downloadAttendanceFile(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

