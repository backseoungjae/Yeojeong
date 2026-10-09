import { type DatabaseAccess, StorageError, type SqlConnection } from '../../../shared/database/database.ts';
import type { ContentLanguage } from '../../../shared/models/place.ts';
import type { ResolvedTheme } from '../../../shared/theme/tokens.ts';
export interface Preferences { language?: ContentLanguage; theme?: ResolvedTheme }
async function readPreferences(db: SqlConnection): Promise<Preferences> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key,value FROM preferences');
  const result: Preferences = {};
  for (const row of rows) {
    if (row.key === 'language' && (row.value === 'ko' || row.value === 'en')) result.language = row.value;
    else if (row.key === 'theme' && (row.value === 'light' || row.value === 'dark')) result.theme = row.value;
    else throw new StorageError('data');
  }
  return result;
}
export function createSettingsRepository(database: DatabaseAccess) {
  const write = (key: 'language' | 'theme', value: string) => database.transaction(async db => {
    if (key === 'language' ? value !== 'ko' && value !== 'en' : value !== 'light' && value !== 'dark') throw new StorageError('data');
    await db.runAsync('INSERT INTO preferences (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', key, value);
    return readPreferences(db);
  });
  return { load: () => database.read(readPreferences), setLanguage: (language: ContentLanguage) => write('language', language), setTheme: (theme: ResolvedTheme) => write('theme', theme) };
}
export type SettingsRepository = ReturnType<typeof createSettingsRepository>;
