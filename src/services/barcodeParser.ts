/**
 * Barcode Parser Service
 *
 * AUTHORITATIVE SPECIFICATION:
 * - DoD ID Bar Code SDK Formats v7.5.0 (September 2012)
 * - Defense Manpower Data Center (DMDC) Common Access Card (CAC) Specification
 * - Version 1 (88 chars) and Version N (89 chars) PDF417 fixed-width format:
 *   - Offset 0 (len 1): Barcode Version ('1' or 'N')
 *   - Offset 1..6 (len 6): Personal Designator Identifier (PDI) [Base-32, PII - Discarded]
 *   - Offset 7 (len 1): Personal Designator Type (PDT) [PII - Discarded]
 *   - Offset 8..14 (len 7): EDIPI / DoD ID Number [Base-32, PII - Discarded]
 *   - Offset 15..34 (len 20): Cardholder First Name [Space-padded, Retained]
 *   - Offset 35..60 (len 26): Cardholder Last Name [Space-padded, Retained]
 *   - Offset 61..64 (len 4): Date of Birth [Base-32 days since 1000-01-01 - Discarded]
 *   - Offset 65..66 (len 2): Personnel Category Code [Discarded]
 *   - Offset 67..74 (len 8): Card Instance / Expiration / Subcategory [Discarded]
 *   - Offset 75 (len 1): Branch of Service / Agency Code [Retained for Unit]
 *   - Offset 76..87 (len 12): Rank / Pay Grade / Card Security data [Discarded]
 *   - Offset 88 (len 1): Cardholder Middle Initial (Version N only) [Retained]
 *
 * PRIVACY & SECURITY RULES:
 * 1. Never retain, log, or persist raw barcode payloads or images.
 * 2. Never extract, store, or transmit EDIPI, SSN, DOB, or card serial numbers.
 * 3. Enforce maximum input length limit (2048 chars) to prevent ReDoS / DoS.
 * 4. Never evaluate raw payloads as HTML or executable code.
 * 5. Distinctly mark synthetic demo scans so they are never confused with real scans.
 * 6. Speculative fallbacks that guess names from arbitrary patterns are rejected.
 */

import { BarcodeParseResult } from '../types';

export const MAX_BARCODE_PAYLOAD_LENGTH = 2048;

/**
 * Validates and strips dangerous control characters.
 */
function cleanString(str: string): string {
  return str.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
}

/**
 * Sanitizes a name component:
 * - Trims external whitespace.
 * - Converts to uppercase.
 * - Allows letters, spaces, hyphens, and apostrophes (e.g. "O'CONNOR", "SMITH-JONES", "ST. JOHN").
 * - Does not alter spelling or strip valid internal characters.
 */
function sanitizeNamePart(part: string): string {
  const cleaned = cleanString(part).toUpperCase();
  // Allow letters, hyphens, apostrophes, periods, and internal spaces
  return cleaned
    .replace(/^[^A-Z]+/, '')
    .replace(/[^A-Z]+$/, '');
}

/**
 * Format raw names into standard roster format: "LAST, FIRST" or "LAST, FIRST M"
 */
export function formatDisplayName(first: string, last: string, middleInitial?: string): string {
  const f = sanitizeNamePart(first);
  const l = sanitizeNamePart(last);
  const m = middleInitial ? cleanString(middleInitial).toUpperCase().charAt(0) : '';

  if (!l && !f) return '';
  if (!f) return l;
  if (!l) return f;

  // If the first name field already contains a middle initial or multiple words (e.g. "MARTIN G"),
  // use that and do not append a trailing initial from charAt(88).
  if (/\s+[A-Z](\.?)$/.test(f)) {
    return `${l}, ${f}`;
  }

  return m && /[A-Z]/.test(m) ? `${l}, ${f} ${m}` : `${l}, ${f}`;
}

/**
 * Branch/Service Code mapping according to DMDC DoD ID Bar Code SDK Formats
 */
const BRANCH_CODE_MAP: Record<string, string> = {
  A: 'US Army',
  C: 'US Coast Guard',
  D: 'DoD Civilian / Agency',
  F: 'US Air Force',
  M: 'US Marine Corps',
  N: 'US Navy',
};

/**
 * DoD CAC Front Barcode Parser
 * Strictly implements DoD ID Bar Code v7.5.0 layout specifications.
 */
export function parseRealCacBarcode(rawPayload: string): BarcodeParseResult {
  if (!rawPayload || typeof rawPayload !== 'string') {
    return {
      status: 'malformed',
      errorMessage: 'Scanned payload is empty or invalid.',
    };
  }

  if (rawPayload.length > MAX_BARCODE_PAYLOAD_LENGTH) {
    return {
      status: 'oversized',
      errorMessage: `Payload exceeds safety limit (${rawPayload.length} > ${MAX_BARCODE_PAYLOAD_LENGTH}).`,
    };
  }

  // Strip leading/trailing whitespaces and optional Code 39 start/stop asterisks
  let trimmed = rawPayload.trim();
  if (trimmed.startsWith('*') && trimmed.endsWith('*') && trimmed.length > 2) {
    trimmed = trimmed.substring(1, trimmed.length - 1).trim();
  }

  // 1. Check for standard 88/89-character fixed-width CAC PDF417 format
  // Also tolerate payloads wrapped with hardware scanner prefixes/suffixes (e.g. STX/ETX or CR/LF)
  const candidate88 = trimmed.length >= 88 ? trimmed.match(/[1N][A-Za-z0-9+/= ]{87,88}/) : null;
  const target88 = (trimmed.length === 88 || trimmed.length === 89) ? trimmed : (candidate88 ? candidate88[0] : null);

  if (target88 && (target88.length === 88 || target88.length === 89)) {
    const versionChar = target88.charAt(0);
    if (versionChar === '1' || versionChar === 'N') {
      try {
        // Authoritative DoD ID Bar Code SDK Formats v7.5.0 offsets:
        // Version: index 0 (1 char)
        // PDI: indices 1..6 (6 chars)
        // PDT: index 7 (1 char)
        // EDIPI: indices 8..14 (7 chars: Base-32 encoded 10-digit number)
        // First Name: indices 15..34 (20 chars, space-padded) -> substring(15, 35)
        // Last Name: indices 35..60 (26 chars, space-padded) -> substring(35, 61)
        // Middle Initial: index 88 (89th character if Version N) -> charAt(88)
        const firstNameRaw = target88.substring(15, 35);
        const lastNameRaw = target88.substring(35, 61);
        let middleInitial = '';

        // Middle Initial: Only Version N specifies an explicit 89th character (index 88) for MI.
        // Version 1 (88 chars) does NOT have an 88th char MI field.
        if (target88.length === 89 && versionChar === 'N') {
          middleInitial = target88.charAt(88);
        }

        const displayName = formatDisplayName(firstNameRaw, lastNameRaw, middleInitial);

        // Branch code at index 75 (Offset 76 in 1-based indexing)
        let detectedUnit: string | undefined = undefined;
        if (target88.length >= 76) {
          const branchChar = target88.charAt(75).toUpperCase();
          if (BRANCH_CODE_MAP[branchChar]) {
            detectedUnit = BRANCH_CODE_MAP[branchChar];
          }
        }

        if (displayName.length > 0) {
          return {
            status: 'success',
            displayName,
            unit: detectedUnit,
            rawSymbology: `PDF417 (DoD CAC Front Spec v${versionChar})`,
            uncertaintyWarning:
              'Parsed using DoD ID Bar Code fixed-width format. Verify attendee name accuracy.',
          };
        }
      } catch {
        return {
          status: 'malformed',
          errorMessage: 'Error extracting name fields from barcode layout.',
        };
      }
    }
  }

  // 2. Check for AAMVA / State ID format (Standard PDF417 for Driver Licenses / State IDs)
  if (trimmed.includes('ANSI ') || (trimmed.includes('DCS') && trimmed.includes('DAC'))) {
    try {
      const dcsMatch = trimmed.match(/DCS([A-Za-z\s\-']+?)(?:[\r\n\x1c\x1d\x1e]|D[A-Z])/);
      const dacMatch = trimmed.match(/DAC([A-Za-z\s\-']+?)(?:[\r\n\x1c\x1d\x1e]|D[A-Z])/);
      const dadMatch = trimmed.match(/DAD([A-Za-z\s\-']+?)(?:[\r\n\x1c\x1d\x1e]|D[A-Z])/);

      const lastName = dcsMatch ? dcsMatch[1] : '';
      const firstName = dacMatch ? dacMatch[1] : '';
      const mi = dadMatch ? dadMatch[1].charAt(0) : '';

      const displayName = formatDisplayName(firstName, lastName, mi);
      if (displayName) {
        return {
          status: 'success',
          displayName,
          rawSymbology: 'PDF417 (AAMVA DL/ID)',
        };
      }
    } catch {
      // Continue to unsupported rejection
    }
  }

  // 3. Check for Back Linear Code 39 Barcode (Typically 18 characters, e.g. "1..." or "N...")
  // The back linear barcode ONLY encodes the base-32 EDIPI (DoD ID), never cardholder names.
  if (trimmed.length === 18 && (trimmed.startsWith('1') || trimmed.startsWith('N'))) {
    return {
      status: 'unsupported',
      rawSymbology: 'Code 39 (Back of CAC)',
      errorMessage:
        'Back linear barcode (Code 39) detected! The back barcode only encodes DoD ID/EDIPI without names. Please scan the PDF417 2D barcode on the FRONT of the CAC, or tap Manual Entry below.',
    };
  }

  // 4. Safe rejection for unrecognized formats (Do NOT guess or infer names from unverified text)
  return {
    status: 'unsupported',
    errorMessage:
      'Barcode format not recognized as a verified front CAC barcode. Please ensure you scan the front PDF417 2D barcode or use manual entry.',
  };
}

/**
 * Synthetic Demo Barcode Parser
 * Clearly distinguished from real CAC parsing.
 * Format prefix: "SYNTHETIC:CAC:" or "SYNTHETIC_FIXED_89:"
 */
export function parseSyntheticBarcode(payload: string): BarcodeParseResult {
  if (!payload || typeof payload !== 'string') {
    return { status: 'malformed', errorMessage: 'Empty synthetic payload' };
  }

  if (payload.length > MAX_BARCODE_PAYLOAD_LENGTH) {
    return { status: 'oversized', errorMessage: 'Payload exceeds maximum size' };
  }

  const trimmed = payload.trim();

  // 1. Check for SYNTHETIC:CAC: prefix
  if (trimmed.startsWith('SYNTHETIC:CAC:')) {
    // Format: SYNTHETIC:CAC:LAST:FIRST:MI:UNIT
    const parts = trimmed.split(':');
    const last = parts[2] || '';
    const first = parts[3] || '';
    const mi = parts[4] || '';
    const unit = parts[5] || '';

    const displayName = formatDisplayName(first, last, mi);
    return {
      status: 'success',
      displayName: displayName || 'SYNTHETIC ATTENDEE',
      unit: unit || 'Demo Organization',
      isSynthetic: true,
      rawSymbology: 'SYNTHETIC_DEMO_CODE',
    };
  }

  // 2. Check for synthetic fixed-width 89-char fixture
  if (trimmed.startsWith('SYNTHETIC_FIXED_89:')) {
    const rawFixed = trimmed.replace('SYNTHETIC_FIXED_89:', '');
    const result = parseRealCacBarcode(rawFixed);
    return {
      ...result,
      isSynthetic: true,
    };
  }

  return {
    status: 'unsupported',
    errorMessage: 'Barcode format not supported—use manual entry',
  };
}

/**
 * Unified Parser Dispatcher
 * Rejects oversized inputs, dispatches verified real vs synthetic parser.
 * Discards raw payload immediately after parsing.
 */
export function parseBarcodePayload(rawPayload: string): BarcodeParseResult {
  if (!rawPayload || typeof rawPayload !== 'string') {
    return { status: 'malformed', errorMessage: 'Empty or invalid barcode payload' };
  }

  if (rawPayload.length > MAX_BARCODE_PAYLOAD_LENGTH) {
    return {
      status: 'oversized',
      errorMessage: `Payload rejected: size ${rawPayload.length} exceeds maximum allowed limit.`,
    };
  }

  // If payload matches synthetic demo prefix
  if (rawPayload.startsWith('SYNTHETIC:') || rawPayload.startsWith('SYNTHETIC_FIXED_89:')) {
    return parseSyntheticBarcode(rawPayload);
  }

  // Otherwise, attempt verified real CAC parser
  return parseRealCacBarcode(rawPayload);
}

/**
 * Helper to generate valid synthetic 89-character fixture for testing/demo
 * Matches DoD ID Bar Code SDK Formats v7.5.0 layout exactly.
 */
export function createSyntheticCac89String(
  first: string,
  last: string,
  mi: string = 'A',
  branchCode: string = 'A'
): string {
  // Offset 0 (1 char): Version 'N'
  const version = 'N';
  // Offset 1..6 (6 chars): PDI
  const pdi = '123456';
  // Offset 7 (1 char): PDT
  const pdt = 'D';
  // Offset 8..14 (7 chars): Base-32 EDIPI
  const edipi = '1234567';
  // Offset 15..34 (20 chars): First Name padded with spaces
  const fnPadded = first.toUpperCase().padEnd(20, ' ').substring(0, 20);
  // Offset 35..60 (26 chars): Last Name padded with spaces
  const lnPadded = last.toUpperCase().padEnd(26, ' ').substring(0, 26);
  // Offset 61..74 (14 chars): DOB and Category filler
  const filler1 = '00000000000000';
  // Offset 75 (1 char): Branch code ('A', 'C', 'D', 'F', 'M', 'N')
  const branch = (branchCode || 'A').toUpperCase().charAt(0);
  // Offset 76..87 (12 chars): Card filler
  const filler2 = '000000000000';
  // Offset 88 (1 char): Middle Initial (89th char)
  const middleInitial = (mi || ' ').toUpperCase().charAt(0);

  return `${version}${pdi}${pdt}${edipi}${fnPadded}${lnPadded}${filler1}${branch}${filler2}${middleInitial}`;
}
