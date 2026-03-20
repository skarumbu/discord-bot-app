import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandRouter } from '../../src/core/router.js';
import { discoverAndRegister } from '../../src/core/registry.js';
import type { InProcessAdapter, CommandContext } from '../../src/types/index.js';

vi.mock('node:fs');

import { readdirSync } from 'node:fs';

const makePlugin = (commands: string[]): InProcessAdapter => ({
  commands,
  slashCommandDefinitions: [],
  execute: vi.fn().mockResolvedValue({ content: 'ok' }),
});

const makeCtx = (command: string): CommandContext => ({
  command,
  args: {},
  context: { guildId: 'g', channelId: 'c', invokingUserId: 'u', invokingUserName: 'user' },
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe('discoverAndRegister', () => {
  it('registers a valid plugin', async () => {
    const plugin = makePlugin(['weather']);
    vi.mocked(readdirSync).mockReturnValue(['weather'] as any);
    const loader = vi.fn().mockResolvedValue({ default: plugin });

    const router = new CommandRouter();
    await discoverAndRegister(router, { loader, pluginsDir: '/fake/plugins' });

    expect(loader).toHaveBeenCalledOnce();
    const result = await router.dispatch(makeCtx('weather'));
    expect(result.content).toBe('ok');
  });

  it('skips a plugin with invalid shape and logs a warning', async () => {
    vi.mocked(readdirSync).mockReturnValue(['bad-plugin'] as any);
    const loader = vi.fn().mockResolvedValue({ default: { notAPlugin: true } });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const router = new CommandRouter();

    // Will throw because zero plugins loaded
    await expect(
      discoverAndRegister(router, { loader, pluginsDir: '/fake/plugins' })
    ).rejects.toThrow('no plugins loaded');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid plugin shape'));
  });

  it('skips a plugin that throws on import and logs a warning', async () => {
    vi.mocked(readdirSync).mockReturnValue(['broken-plugin'] as any);
    const loader = vi.fn().mockRejectedValue(new Error('import error'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const router = new CommandRouter();
    await expect(
      discoverAndRegister(router, { loader, pluginsDir: '/fake/plugins' })
    ).rejects.toThrow('no plugins loaded');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('broken-plugin'),
      expect.any(Error)
    );
  });

  it('throws if zero plugins load successfully', async () => {
    vi.mocked(readdirSync).mockReturnValue([]);

    const router = new CommandRouter();
    await expect(
      discoverAndRegister(router, { loader: vi.fn(), pluginsDir: '/fake/plugins' })
    ).rejects.toThrow('no plugins loaded');
  });
});
