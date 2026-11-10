/**
 * Barcode Parser Service
 *
 * PRIVACY & SECURITY RULES:
 * 1. Never retain or persist raw barcode strings.
 * 2. Never extract or return EDIPI, SSN, birth date, card serial, or cryptographic keys.
 * 3. Enforce maximum input size to prevent memory exhaustion / DoS attacks.
 * 4. Never evaluate raw payloads as HTML or executable code.
 * 5. Clearly distinguish verified parsers from synthetic demo parsers.
 */

import { BarcodeParseResult } from '../types';

// Maximum payload size safety limit (e.g. 2048 characters)
export const MAX_BARCODE_PAYLOAD_LENGTH = 2048;

/**
 * Validates and strips dangerous control characters.
 */
function cleanString(str: string): string {
  // Remove ASCII control characters except standard space
  return str.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
}

/**
 * Clean up extra leading/trailing padding characters that can creep in from 1-character shifts
 */
function cleanNamePart(part: string): string {
  let cleaned = cleanString(part).toUpperCase();
  // Strip leading non-alphabetics
  cleaned = cleaned.replace(/^[^A-Z]+/, '');
  // Strip trailing non-alphabetics
  cleaned = cleaned.replace(/[^A-Z]+$/, '');
  return cleaned;
}

/**
 * Format raw names: "LAST, FIRST M"
 */
function formatDisplayName(first: string, last: string, middleInitial?: string): string {
  const f = cleanNamePart(first);
  const l = cleanNamePart(last);
  const m = middleInitial ? cleanString(middleInitial).toUpperCase().charAt(0) : '';

  if (!l && !f) return '';
  if (!f) return l;
  if (!l) return f;

  return m && /[A-Z]/.test(m) ? `${l}, ${f} ${m}` : `${l}, ${f}`;
}

/**
 * Branch/Service Code mapping according to DMDC / DoD ID Bar Code SDK Formats
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
 *
 * Supported Format:
 * - DoD ID Barcode Specification (Version 1 / Version N fixed-width PDF417 format)
 * - Typically 88 or 89 characters.
 *   - Char 0: Version ('1' or 'N')
 *   - Char 1-6: Personal Designator Identifier (PDI) [DISCARDED - Sensitive/PII]
 *   - Char 7: Personal Designator Type (PDT) [DISCARDED - Sensitive/PII]
 *   - Char 8-14: EDIPI / DoD ID (Base-32 or encoded) [DISCARDED - Do NOT retain]
 *   - Char 14-33: First Name (20 chars, space-padded) [RETAINED for Display Name]
 *   - Char 34-59: Last Name (26 chars, space-padded) [RETAINED for Display Name]
 *   - Char 60-87: Personnel details (DOB, Branch, Rank, Exp) [DOB DISCARDED, Branch optionally mapped to unit]
 *   - Char 88 (if length 89): Middle Initial [RETAINED]
 *
 * Source: Public DoD ID Bar Code SDK Formats v7.x documentation and open-source implementations.
 * Limitations & Uncertainty:
 * - NextGen CAC formats or variants issued by non-standard issuers may use altered offsets.
 * - If length/version does not strictly match verified patterns, parsing fails safely to manual entry.
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
  // Also check if payload contains 88 or 89 chars (e.g., if preceded or followed by non-printable chars)
  const candidate88 = trimmed.length >= 88 ? trimmed.match(/[1N][A-Za-z0-9+/= ]{87,88}/) : null;
  const target88 = (trimmed.length === 88 || trimmed.length === 89) ? trimmed : (candidate88 ? candidate88[0] : null);

  if (target88 && (target88.length === 88 || target88.length === 89)) {
    const versionChar = target88.charAt(0);
    if (versionChar === '1' || versionChar === 'N') {
      try {
        // According to DoD CAC v1 / vN specification:
        // Version 1 / N: Char 0 (1 char)
        // PDI: Chars 1..6 (6 chars)
        // PDT: Char 7 (1 char)
        // EDIPI: Chars 8..14 (7 chars: Base-32 encoded number)
        // First Name: Chars 15..34 (20 chars, space padded)
        // Last Name: Chars 35..60 (26 chars, space padded)
        // Middle Initial: Char 88 (89th character if Version N)
        const firstNameRaw = target88.substring(15, 35);
        const lastNameRaw = target88.substring(35, 61);
        let middleInitial = '';

        if (target88.length === 89) {
          middleInitial = target88.charAt(88);
        }

        const displayName = formatDisplayName(firstNameRaw, lastNameRaw, middleInitial);

        let detectedUnit: string | undefined = undefined;
        if (target88.length >= 76) {
          const branchChar = target88.charAt(75).toUpperCase();
          if (BRANCH_CODE_MAP[branchChar]) {
            detectedUnit = BRANCH_CODE_MAP[branchChar];
          } else if (BRANCH_CODE_MAP[target88.charAt(74).toUpperCase()]) {
            detectedUnit = BRANCH_CODE_MAP[target88.charAt(74).toUpperCase()];
          }
        }

        if (displayName.length > 0) {
          return {
            status: 'success',
            displayName,
            unit: detectedUnit,
            rawSymbology: 'PDF417 (DoD CAC Front Spec v1/N)',
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

  // 2. Check for AAMVA / State ID format (DCS: Last Name, DAC: First Name, DAD: Middle)
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
      // continue fallback
    }
  }

  // 3. Check for Back Linear Code 39 Barcode (Typically 18 characters, e.g. "1..." or "N...")
  // The back barcode ONLY carries the encrypted/base-32 EDIPI (DoD ID), not cardholder names.
  if (trimmed.length === 18 && (trimmed.startsWith('1') || trimmed.startsWith('N'))) {
    return {
      status: 'unsupported',
      rawSymbology: 'Code 39 (Back of CAC)',
      errorMessage:
        'Back linear barcode (Code 39) detected! The back barcode only encodes DoD ID/EDIPI without names. Please scan the PDF417 2D barcode on the FRONT of the CAC, or tap Manual Entry below.',
    };
  }

  // 4. Tolerant extraction if raw text looks like "LAST, FIRST" or fixed blocks with spaces
  const nameCommaMatch = trimmed.match(/([A-Z]{2,26}),\s*([A-Z]{2,20})(?:\s+([A-Z]))?/);
  if (nameCommaMatch) {
    const displayName = formatDisplayName(nameCommaMatch[2], nameCommaMatch[1], nameCommaMatch[3]);
    return {
      status: 'success',
      displayName,
      rawSymbology: 'PDF417 (Detected Name Pattern)',
    };
  }

  // Not matching verified front barcode format
  return {
    status: 'unsupported',
    errorMessage:
      'Barcode format not recognized as a verified front CAC barcode. Please ensure you scan the front PDF417 2D barcode or use manual entry.',
  };
}

/**
 * Synthetic Demo Barcode Parser
 * Clearly distinguished from real CAC parsing.
 * Allows safe demonstrations and automated testing without real card data.
 *
 * Format prefix: "SYNTHETIC:CAC:" or JSON string containing demo data
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
    return parseRealCacBarcode(rawFixed);
  }

  return {
    status: 'unsupported',
    errorMessage: 'Barcode format not supported—use manual entry',
  };
}

/**
 * Unified Parser Dispatcher
 * Rejects oversized inputs, attempts verified parser, then synthetic parser.
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
  if (rawPayload.startsWith('SYNTHETIC:')) {
    return parseSyntheticBarcode(rawPayload);
  }

  // Otherwise, attempt verified real CAC parser
  return parseRealCacBarcode(rawPayload);
}

/**
 * Helper to generate valid synthetic 89-char fixture for testing/demo
 */
export function createSyntheticCac89String(first: string, last: string, mi: string = 'A', branchCode: string = 'A'): string {
  // 1 char version: 'N' (index 0)
  const version = 'N';
  // 6 chars PDI (indices 1-6)
  const pdi = '123456';
  // 1 char PDT (index 7)
  const pdt = 'D';
  // 7 chars EDIPI (indices 8-14: 7 chars base-32)
  const edipi = '1234567';
  // 20 chars First name (indices 15-34, padded with spaces)
  const fnPadded = first.toUpperCase().padEnd(20, ' ').substring(0, 20);
  // 26 chars Last name (indices 35-60, padded with spaces)
  const lnPadded = last.toUpperCase().padEnd(26, ' ').substring(0, 26);
  // 14 chars filler for personnel fields (indices 61-74)
  const filler1 = '00000000000000';
  // 1 char branch code (index 75: 'A', 'F', 'N', etc.)
  const branch = (branchCode || 'A').toUpperCase().charAt(0);
  // 12 chars filler for expiration/rank (indices 76-87)
  const filler2 = '000000000000';
  // 1 char Middle Initial (index 88, 89th char)
  const middleInitial = (mi || ' ').toUpperCase().charAt(0);

  return `${version}${pdi}${pdt}${edipi}${fnPadded}${lnPadded}${filler1}${branch}${filler2}${middleInitial}`;
}
