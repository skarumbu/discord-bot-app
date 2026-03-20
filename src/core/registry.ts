import { readdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { InProcessAdapter } from '../types/index.js';
import type { CommandRouter } from './router.js';

type PluginLoader = (url: string) => Promise<unknown>;

function isValidPlugin(obj: unknown): obj is InProcessAdapter {
  if (typeof obj !== 'object' || obj === null) return false;
  const p = obj as Record<string, unknown>;
  return (
    Array.isArray(p['commands']) &&
    (p['commands'] as unknown[]).length > 0 &&
    (p['commands'] as unknown[]).every((c) => typeof c === 'string') &&
    Array.isArray(p['slashCommandDefinitions']) &&
    typeof p['execute'] === 'function'
  );
}

export async function discoverAndRegister(
  router: CommandRouter,
  options: {
    loader?: PluginLoader;
    pluginsDir?: string;
  } = {}
): Promise<void> {
  const loader = options.loader ?? ((url: string) => import(url));

  const pluginsDir =
    options.pluginsDir ??
    join(dirname(fileURLToPath(import.meta.url)), '..', 'plugins');

  const ext = options.pluginsDir
    ? '.js' // default for injected paths
    : extname(fileURLToPath(import.meta.url)); // .ts in dev, .js in prod

  const entries = readdirSync(pluginsDir);
  let loaded = 0;

  for (const entry of entries) {
    const pluginPath = join(pluginsDir, entry, `index${ext}`);
    const pluginUrl = pathToFileURL(pluginPath).href;

    try {
      const mod = await loader(pluginUrl);
      const plugin = (mod as { default?: unknown }).default ?? mod;

      if (!isValidPlugin(plugin)) {
        console.warn(`[registry] skipping ${entry}: invalid plugin shape`);
        continue;
      }

      router.register(plugin);
      loaded++;
      console.log(`[registry] loaded plugin: ${entry} (commands: ${plugin.commands.join(', ')})`);
    } catch (err) {
      console.warn(`[registry] skipping ${entry}:`, err);
    }
  }

  if (loaded === 0) {
    throw new Error('[registry] no plugins loaded successfully — bot cannot start');
  }
}
