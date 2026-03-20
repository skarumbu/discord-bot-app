import { describe, it, expect, vi } from 'vitest';
import { CommandRouter } from '../../src/core/router.js';
import type { InProcessAdapter, CommandContext } from '../../src/types/index.js';
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord-api-types/v10';

const makeCtx = (command: string, args: Record<string, string> = {}): CommandContext => ({
  command,
  args,
  context: {
    guildId: 'g1',
    channelId: 'c1',
    invokingUserId: 'u1',
    invokingUserName: 'testuser',
  },
});

const makePlugin = (commands: string[]): InProcessAdapter => ({
  commands,
  slashCommandDefinitions: [],
  execute: vi.fn().mockResolvedValue({ content: 'plugin response' }),
});

describe('CommandRouter', () => {
  it('dispatches to a registered plugin', async () => {
    const router = new CommandRouter();
    const plugin = makePlugin(['weather']);
    router.register(plugin);

    const ctx = makeCtx('weather', { zipcode: '10001' });
    const result = await router.dispatch(ctx);

    expect(result.content).toBe('plugin response');
    expect(plugin.execute).toHaveBeenCalledWith(ctx);
  });

  it('returns fallback response for unknown command', async () => {
    const router = new CommandRouter();
    const result = await router.dispatch(makeCtx('unknown'));

    expect(result.content).toBe('Unknown command.');
    expect(result.ephemeral).toBe(true);
  });

  it('registers a plugin with multiple commands', async () => {
    const router = new CommandRouter();
    const plugin = makePlugin(['foo', 'bar']);
    router.register(plugin);

    const fooResult = await router.dispatch(makeCtx('foo'));
    const barResult = await router.dispatch(makeCtx('bar'));

    expect(fooResult.content).toBe('plugin response');
    expect(barResult.content).toBe('plugin response');
  });

  it('collects slash command definitions from registered plugins', () => {
    const router = new CommandRouter();
    const def = {
      name: 'weather',
      description: 'weather',
      options: [],
    } as unknown as RESTPostAPIChatInputApplicationCommandsJSONBody;
    const plugin: InProcessAdapter = {
      commands: ['weather'],
      slashCommandDefinitions: [def],
      execute: vi.fn().mockResolvedValue({ content: 'ok' }),
    };
    router.register(plugin);

    expect(router.getSlashCommandDefinitions()).toContain(def);
  });
});
