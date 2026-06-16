import { apiFetch } from '@/services/api';

/** The two AppConfig keys the admin screen edits (prototype `ADMIN_CONFIG`). */
export type AppConfigKey = 'LOW_BALANCE_THRESHOLD' | 'SLOT_DURATION_MINS';

/** A config row for the list: key + i18n description key + current value. */
export interface AppConfigRow {
  key: AppConfigKey;
  descKey: string;
  value: string;
}

/** Body for `PATCH /admin/config/:key`. */
export interface UpdateConfigInput {
  key: AppConfigKey;
  value: string;
}

/**
 * Ordered config keys + their description i18n keys + fallback defaults
 * (mirrors the API's `KNOWN_DEFAULTS` and the prototype `ADMIN_CONFIG`).
 */
const CONFIG_DEFINITIONS: ReadonlyArray<{
  key: AppConfigKey;
  descKey: string;
  fallback: string;
}> = [
  { key: 'LOW_BALANCE_THRESHOLD', descKey: 'admin.config.lowBalanceDesc', fallback: '50' },
  { key: 'SLOT_DURATION_MINS', descKey: 'admin.config.slotDurationDesc', fallback: '30' },
];

export const adminConfigService = {
  /**
   * Fetch the AppConfig as an ordered row list. `GET /admin/config` returns a
   * `Record<string, string>` key→value map (the live API response, which differs
   * from docs/05's `AppConfig[]` — implementation wins); we project it onto the
   * known keys so the screen renders a stable, ordered list with descriptions.
   */
  async listConfig(): Promise<AppConfigRow[]> {
    const map = await apiFetch<Record<string, string>>('/admin/config');
    return CONFIG_DEFINITIONS.map((def) => ({
      key: def.key,
      descKey: def.descKey,
      value: map[def.key] ?? def.fallback,
    }));
  },

  /** Update one config value (`PATCH /admin/config/:key`). */
  updateConfig({ key, value }: UpdateConfigInput): Promise<{ key: string; value: string }> {
    return apiFetch<{ key: string; value: string }>(
      `/admin/config/${encodeURIComponent(key)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ value }),
      },
    );
  },
};
