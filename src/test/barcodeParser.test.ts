import { describe, it, expect } from 'vitest';
import {
  parseBarcodePayload,
  parseRealCacBarcode,
  parseSyntheticBarcode,
  createSyntheticCac89String,
  formatDisplayName,
  MAX_BARCODE_PAYLOAD_LENGTH,
} from '../services/barcodeParser';

describe('Barcode Parser Service - CAC & Security Tests', () => {
  it('parses valid synthetic 89-character front CAC fixture correctly according to DoD ID Bar Code v7.5.0', () => {
    const fixture = createSyntheticCac89String('JOHN', 'DOE', 'A', 'F');
    expect(fixture.length).toBe(89);

    const result = parseBarcodePayload(fixture);
    expect(result.status).toBe('success');
    expect(result.displayName).toBe('DOE, JOHN A');
    expect(result.unit).toBe('US Air Force');
    // Ensure no sensitive fields like EDIPI are included in result object
    expect(result).not.toHaveProperty('edipi');
    expect(result).not.toHaveProperty('ssn');
    expect(result).not.toHaveProperty('rawPayload');
  });

  it('prevents off-by-one corruption on first/last boundary (regression test for GGAKURIA, KMARTIN B)', () => {
    // Specifically test the boundary conditions where EDIPI ends with 'K' and First name is 'MARTIN' and Last name is 'GAKURIA'
    // Offset 0: 'N'
    // Offset 1..7: PDI/PDT (7 chars)
    // Offset 8..14: EDIPI ending with 'K': '123456K'
    // Offset 15..34: First Name (20 chars): 'MARTIN              '
    // Offset 35..60: Last Name (26 chars): 'GAKURIA                   '
    // Offset 61..74: filler (14 chars)
    // Offset 75: Branch 'A' (Army)
    // Offset 76..87: filler (12 chars)
    // Offset 88: Middle Initial 'B'
    const edipiWithK = '123456K';
    const fn = 'MARTIN'.padEnd(20, ' ');
    const ln = 'GAKURIA'.padEnd(26, ' ');
    const filler1 = '00000000000000';
    const branch = 'A';
    const filler2 = '000000000000';
    const mi = 'B';
    const payload = `N123456D${edipiWithK}${fn}${ln}${filler1}${branch}${filler2}${mi}`;

    expect(payload.length).toBe(89);
    // Index check:
    expect(payload.charAt(14)).toBe('K'); // EDIPI last char
    expect(payload.substring(15, 35)).toBe(fn); // First name
    expect(payload.substring(35, 61)).toBe(ln); // Last name
    expect(payload.charAt(88)).toBe('B'); // Middle initial

    const result = parseRealCacBarcode(payload);
    expect(result.status).toBe('success');
    // Must NOT have 'K' prepended to MARTIN or extra 'G' prepended to GAKURIA
    expect(result.displayName).toBe('GAKURIA, MARTIN B');
    expect(result.displayName).not.toContain('GGAKURIA');
    expect(result.displayName).not.toContain('KMARTIN');
    expect(result.unit).toBe('US Army');
  });

  it('parses 88-character CAC fixture without middle initial (Version 1)', () => {
    const fixture89 = createSyntheticCac89String('JANE', 'SMITH', 'B', 'A');
    const fixture88 = fixture89.substring(0, 88);
    expect(fixture88.length).toBe(88);

    const result = parseRealCacBarcode(fixture88);
    expect(result.status).toBe('success');
    expect(result.displayName).toBe('SMITH, JANE');
    expect(result.unit).toBe('US Army');
  });

  it('handles names with hyphens and apostrophes cleanly without altering spelling', () => {
    const fn = "MARY-JANE".padEnd(20, ' ');
    const ln = "O'CONNOR".padEnd(26, ' ');
    const payload = `N123456D1234567${fn}${ln}${'0'.repeat(14)}M${'0'.repeat(12)}E`;
    expect(payload.length).toBe(89);

    const result = parseRealCacBarcode(payload);
    expect(result.status).toBe('success');
    expect(result.displayName).toBe("O'CONNOR, MARY-JANE E");
    expect(result.unit).toBe('US Marine Corps');
  });

  it('extracts valid CAC barcode when wrapped by hardware scanner prefixes/suffixes', () => {
    const validCac = createSyntheticCac89String('ALEX', 'RIVERA', 'J', 'N');
    const wrappedPayload = `\x02\r\n${validCac}\r\n\x03`;

    const result = parseRealCacBarcode(wrappedPayload);
    expect(result.status).toBe('success');
    expect(result.displayName).toBe('RIVERA, ALEX J');
    expect(result.unit).toBe('US Navy');
  });

  it('detects and safely rejects back linear Code 39 barcode (DoD ID only, no name)', () => {
    // 18-character linear barcode typical on the back of CAC cards
    const backBarcode = '112345678901234567';
    const result = parseRealCacBarcode(backBarcode);
    expect(result.status).toBe('unsupported');
    expect(result.rawSymbology).toBe('Code 39 (Back of CAC)');
    expect(result.errorMessage).toContain('Back linear barcode');
  });

  it('safely rejects speculative unverified text without inventing names', () => {
    // Unverified text that does not follow DoD CAC or AAMVA spec must be rejected
    const randomScan = 'UNKNOWN_PAYLOAD_WITHOUT_SPEC_FORMAT_0123456789';
    const result = parseRealCacBarcode(randomScan);
    expect(result.status).toBe('unsupported');
    expect(result.displayName).toBeUndefined();
  });

  it('parses synthetic test fixtures with SYNTHETIC:CAC: prefix and flags isSynthetic', () => {
    const raw = 'SYNTHETIC:CAC:TAYLOR:ROBERT:M:US Navy';
    const result = parseSyntheticBarcode(raw);
    expect(result.status).toBe('success');
    expect(result.displayName).toBe('TAYLOR, ROBERT M');
    expect(result.unit).toBe('US Navy');
    expect(result.isSynthetic).toBe(true);
  });

  it('parses synthetic fixed-width 89 fixtures and marks them isSynthetic', () => {
    const rawFixed = createSyntheticCac89String('DAVID', 'CLARK', 'E', 'F');
    const result = parseBarcodePayload(`SYNTHETIC_FIXED_89:${rawFixed}`);
    expect(result.status).toBe('success');
    expect(result.displayName).toBe('CLARK, DAVID E');
    expect(result.isSynthetic).toBe(true);
  });

  it('rejects oversized payloads to prevent DoS attacks', () => {
    const hugePayload = 'A'.repeat(MAX_BARCODE_PAYLOAD_LENGTH + 50);
    const result = parseBarcodePayload(hugePayload);
    expect(result.status).toBe('oversized');
    expect(result.errorMessage).toContain('exceeds');
  });

  it('handles empty and malformed payloads gracefully without crashing', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(parseBarcodePayload('' as any).status).toBe('malformed');
    expect(parseBarcodePayload('RANDOM_TEXT_123').status).toBe('unsupported');
  });

  it('never stores raw barcode payload in parse result', () => {
    const fixture = createSyntheticCac89String('ALICE', 'WONDER', 'M', 'N');
    const result = parseBarcodePayload(fixture);
    expect(JSON.stringify(result)).not.toContain(fixture);
  });

  it('formatDisplayName handles missing middle initials and edge cases', () => {
    expect(formatDisplayName('JOHN', 'DOE')).toBe('DOE, JOHN');
    expect(formatDisplayName('JOHN', 'DOE', '')).toBe('DOE, JOHN');
    expect(formatDisplayName('JOHN', 'DOE', ' ')).toBe('DOE, JOHN');
    expect(formatDisplayName('JOHN', 'DOE', 'M')).toBe('DOE, JOHN M');
    expect(formatDisplayName('', 'DOE')).toBe('DOE');
    expect(formatDisplayName('JOHN', '')).toBe('JOHN');
    // When first name already includes middle initial (e.g. 'MARTIN G')
    expect(formatDisplayName('MARTIN G', 'GAKURIA')).toBe('GAKURIA, MARTIN G');
    expect(formatDisplayName('MARTIN G', 'GAKURIA', 'B')).toBe('GAKURIA, MARTIN G');
  });
});
