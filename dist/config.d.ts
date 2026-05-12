/**
 * CodeBuddy HUD - Configuration Loader
 *
 * Loads and validates user configuration from config.json,
 * with preset system, theme system, and i18n support.
 * Merges user config with preset/theme defaults.
 */
import type { HudConfig } from './types.js';
type PresetName = 'full' | 'essential' | 'minimal';
type ThemeName = 'default' | 'dracula' | 'solarized' | 'monokai' | 'nord';
type RecursivePartial<T> = {
    [P in keyof T]?: T[P] extends object ? RecursivePartial<T[P]> : T[P];
};
interface RawUserConfig extends RecursivePartial<HudConfig> {
    preset?: PresetName;
    theme?: ThemeName;
    language?: 'en' | 'zh';
    adaptiveLayout?: boolean;
}
/**
 * Get the config file path.
 * Stored alongside the statusline script in the plugin directory.
 */
export declare function getConfigPath(): string;
/**
 * Load user configuration, merged with defaults.
 */
export declare function loadConfig(): Promise<HudConfig>;
/**
 * Build final config from raw user config, applying preset + theme.
 */
export declare function buildConfig(raw: RawUserConfig): HudConfig;
export declare function getPresetNames(): string[];
export declare function getThemeNames(): string[];
export {};
//# sourceMappingURL=config.d.ts.map