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
export declare function readStdin(stream?: StdinStream, options?: ReadStdinOptions): Promise<StdinData | null>;
export declare function getModelName(stdin: StdinData): string;
export declare function getModelId(stdin: StdinData): string;
export declare function getProjectName(stdin: StdinData, pathLevels?: number): string;
export declare function getCostUsd(stdin: StdinData): number | null;
export declare function getDuration(stdin: StdinData): number;
export declare function getLinesAdded(stdin: StdinData): number;
export declare function getLinesRemoved(stdin: StdinData): number;
export declare function getSessionId(stdin: StdinData, length?: number): string | null;
export declare function getVersion(stdin: StdinData): string | null;
export declare function getTranscriptPath(stdin: StdinData): string;
export {};
//# sourceMappingURL=stdin.d.ts.map