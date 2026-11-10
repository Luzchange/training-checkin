import { describe, it, expect } from 'vitest';
import {
  parseBarcodePayload,
  parseRealCacBarcode,
  parseSyntheticBarcode,
  createSyntheticCac89String,
  MAX_BARCODE_PAYLOAD_LENGTH,
} from '../services/barcodeParser';

describe('Barcode Parser Service', () => {
  it('parses valid synthetic 89-character front CAC fixture correctly', () => {
    // Generate valid 89-char payload
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

  it('parses 88-character CAC fixture without middle initial', () => {
    // 88 char fixture
    const fixture89 = createSyntheticCac89String('JANE', 'SMITH', 'B', 'A');
    const fixture88 = fixture89.substring(0, 88);
    expect(fixture88.length).toBe(88);

    const result = parseRealCacBarcode(fixture88);
    expect(result.status).toBe('success');
    expect(result.displayName).toBe('SMITH, JANE');
    expect(result.unit).toBe('US Army');
  });

  it('parses synthetic test fixtures with SYNTHETIC:CAC: prefix', () => {
    const raw = 'SYNTHETIC:CAC:TAYLOR:ROBERT:M:US Navy';
    const result = parseSyntheticBarcode(raw);
    expect(result.status).toBe('success');
    expect(result.displayName).toBe('TAYLOR, ROBERT M');
    expect(result.unit).toBe('US Navy');
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
});

