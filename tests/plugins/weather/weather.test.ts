import { describe, it, expect, vi, afterEach } from 'vitest';
import type { CommandContext } from '../../../src/types/index.js';

const makeCtx = (zipcode: string): CommandContext => ({
  command: 'weather',
  args: { zipcode },
  context: {
    guildId: 'g1',
    channelId: 'c1',
    invokingUserId: 'u1',
    invokingUserName: 'testuser',
  },
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('weather plugin', () => {
  it('returns weather string from wttr.in on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('10001: ⛅ +72°F'),
    }));

    const { default: plugin } = await import('../../../src/plugins/weather/index.js');
    const result = await plugin.execute(makeCtx('10001'));

    expect(result.content).toBe('10001: ⛅ +72°F');
    expect(result.ephemeral).toBe(true);
    expect(fetch).toHaveBeenCalledWith('https://wttr.in/10001?format=3');
  });

  it('returns error message when fetch fails with non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn(),
    }));

    const { default: plugin } = await import('../../../src/plugins/weather/index.js');
    const result = await plugin.execute(makeCtx('00000'));

    expect(result.content).toBe("Couldn't fetch weather. Try again.");
    expect(result.ephemeral).toBe(true);
  });

  it('returns error message when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    const { default: plugin } = await import('../../../src/plugins/weather/index.js');
    const result = await plugin.execute(makeCtx('10001'));

    expect(result.content).toBe("Couldn't fetch weather. Try again.");
    expect(result.ephemeral).toBe(true);
  });

  it('exports the correct command name and slash command definition', async () => {
    const { default: plugin } = await import('../../../src/plugins/weather/index.js');

    expect(plugin.commands).toEqual(['weather']);
    expect(plugin.slashCommandDefinitions).toHaveLength(1);
    expect(plugin.slashCommandDefinitions[0].name).toBe('weather');
  });
});
