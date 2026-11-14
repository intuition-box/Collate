import { isAddress, parseEther } from 'viem';

export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeSearchText(value: string): string {
  return normalizeWhitespace(value).toLowerCase();
}

export function parseOptionalSupport(value: string): bigint | null {
  const normalized = value.trim();

  if (!normalized) {
    return 0n;
  }

  try {
    const parsed = parseEther(normalized);
    return parsed < 0n ? null : parsed;
  } catch {
    return null;
  }
}

export function parseOptionalSupportExact(value: string): bigint | null {
  const normalized = value.trim();
  if (normalized && !/^-?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) {
    return null;
  }

  const fractionalDigits = normalized.match(/^-?(?:\d+)?\.(\d+)$/)?.[1];

  if (fractionalDigits && fractionalDigits.length > 18 && /[1-9]/.test(fractionalDigits.slice(18))) {
    return null;
  }

  return parseOptionalSupport(normalized);
}

export function isValidPositiveIntegerString(value: string): boolean {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0;
}

export function isValidOptionalEmail(value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidOptionalHttpsUrl(value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidOptionalImageUrl(value: string): boolean {
  const normalized = value.trim();

  if (!normalized) {
    return true;
  }

  if (
    normalized.startsWith('https://') ||
    normalized.startsWith('http://') ||
    normalized.startsWith('ipfs://') ||
    normalized.startsWith('/ipfs/') ||
    normalized.startsWith('data:') ||
    normalized.startsWith('blob:')
  ) {
    return true;
  }

  return false;
}

export function isValidAccountAddress(value: string): boolean {
  return isAddress(value.trim());
}
