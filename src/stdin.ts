/**
 * CodeBuddy HUD - Stdin JSON Reader
 *
 * Reads JSON data from stdin with timeout handling.
 * CodeBuddy Code passes context data via stdin every ~300ms.
 */

import type { StdinData } from './types.js';

type StdinStream = Pick<NodeJS.ReadStream, 'setEncoding' | 'on' | 'off' | 'pause'> & {
  isTTY?: boolean;
};

export interface ReadStdinOptions {
  firstByteTimeoutMs?: number;
  idleTimeoutMs?: number;
  maxBytes?: number;
}

const DEFAULT_FIRST_BYTE_TIMEOUT_MS = 250;
const DEFAULT_IDLE_TIMEOUT_MS = 30;
const DEFAULT_MAX_STDIN_BYTES = 256 * 1024;

export async function readStdin(
  stream: StdinStream = process.stdin,
  options: ReadStdinOptions = {},
): Promise<StdinData | null> {
  if (stream.isTTY) {
    return null;
  }

  const firstByteTimeoutMs = options.firstByteTimeoutMs ?? DEFAULT_FIRST_BYTE_TIMEOUT_MS;
  const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_STDIN_BYTES;

  try {
    stream.setEncoding('utf8');
  } catch {
    return null;
  }

  return await new Promise<StdinData | null>((resolve) => {
    let raw = '';
    let settled = false;
    let sawData = false;
    let firstByteTimer: ReturnType<typeof setTimeout> | undefined;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = (): void => {
      if (firstByteTimer) {
        clearTimeout(firstByteTimer);
        firstByteTimer = undefined;
      }
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = undefined;
      }
      stream.off('data', onData);
      stream.off('end', onEnd);
      stream.off('error', onError);
      stream.pause();
    };

    const finish = (value: StdinData | null): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const tryParse = (): StdinData | null | undefined => {
      const trimmed = raw.trim();
      if (!trimmed) return null;
      try {
        return JSON.parse(trimmed) as StdinData;
      } catch {
        return undefined;
      }
    };

    const scheduleIdleParse = (): void => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        const parsed = tryParse();
        finish(parsed ?? null);
      }, idleTimeoutMs);
    };

    const onData = (chunk: string | Buffer): void => {
      sawData = true;
      if (firstByteTimer) {
        clearTimeout(firstByteTimer);
        firstByteTimer = undefined;
      }

      raw += String(chunk);
      if (Buffer.byteLength(raw, 'utf8') > maxBytes) {
        finish(null);
        return;
      }

      const parsed = tryParse();
      if (parsed !== undefined) {
        finish(parsed);
        return;
      }

      scheduleIdleParse();
    };

    const onEnd = (): void => {
      const parsed = tryParse();
      finish(parsed ?? null);
    };

    const onError = (): void => {
      finish(null);
    };

    firstByteTimer = setTimeout(() => {
      if (!sawData) finish(null);
    }, firstByteTimeoutMs);

    stream.on('data', onData);
    stream.on('end', onEnd);
    stream.on('error', onError);
  });
}

// ─── Data extraction helpers ────────────────────────────────────────

export function getModelName(stdin: StdinData): string {
  return stdin.model?.display_name ?? stdin.model?.id ?? 'unknown';
}

export function getModelId(stdin: StdinData): string {
  return stdin.model?.id ?? 'unknown';
}

export function getProjectName(stdin: StdinData, pathLevels: number = 1): string {
  const dir = stdin.workspace?.current_dir ?? stdin.cwd ?? '';
  const segments = dir.split(/[/\\]/).filter(Boolean);
  if (segments.length === 0) return '/';
  return segments.slice(-pathLevels).join('/');
}

export function getCostUsd(stdin: StdinData): number | null {
  const cost = stdin.cost?.total_cost_usd;
  if (typeof cost !== 'number' || cost === 0) return null;
  return cost;
}

export function getDuration(stdin: StdinData): number {
  return stdin.cost?.total_duration_ms ?? 0;
}

export function getLinesAdded(stdin: StdinData): number {
  return stdin.cost?.total_lines_added ?? 0;
}

export function getLinesRemoved(stdin: StdinData): number {
  return stdin.cost?.total_lines_removed ?? 0;
}

export function getSessionId(stdin: StdinData, length: number = 8): string | null {
  const id = stdin.session_id;
  if (!id) return null;
  return id.slice(0, length);
}

export function getVersion(stdin: StdinData): string | null {
  return stdin.version ?? null;
}

export function getTranscriptPath(stdin: StdinData): string {
  return stdin.transcript_path ?? '';
}
