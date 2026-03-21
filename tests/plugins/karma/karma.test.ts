import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CommandContext } from '../../../src/types/index.js';

const mockGetEntity = vi.fn();
const mockUpsertEntity = vi.fn();
const mockListEntities = vi.fn();
const mockCreateTable = vi.fn().mockResolvedValue(undefined);

vi.mock('@azure/data-tables', () => ({
  TableClient: {
    fromConnectionString: vi.fn(() => ({
      createTable: mockCreateTable,
      getEntity: mockGetEntity,
      upsertEntity: mockUpsertEntity,
      listEntities: mockListEntities,
    })),
  },
}));

const makeCtx = (
  subcommand: string,
  args: Record<string, string> = {},
  invokingUserId = 'user1'
): CommandContext => ({
  command: 'karma',
  args: { subcommand, ...args },
  context: {
    guildId: 'guild1',
    channelId: 'chan1',
    invokingUserId,
    invokingUserName: 'testuser',
  },
});

// Advances by 2 minutes per test so cooldowns from previous tests are always expired.
let testBaseTime = Date.now();

describe('karma plugin', () => {
  beforeEach(() => {
    testBaseTime += 2 * 60_000;
    vi.useFakeTimers({ toFake: ['Date'], now: testBaseTime });
    vi.clearAllMocks();
    mockGetEntity.mockRejectedValue(Object.assign(new Error('not found'), { statusCode: 404 }));
    mockUpsertEntity.mockResolvedValue(undefined);

    async function* emptyAsyncGen() {}
    mockListEntities.mockReturnValue(emptyAsyncGen());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('give increases target karma by specified amount', async () => {
    mockGetEntity.mockResolvedValue({ partitionKey: 'guild1', rowKey: 'user2', score: 5 });

    const { default: plugin } = await import('../../../src/plugins/karma/index.js');
    const result = await plugin.execute(makeCtx('give', { user: 'user2', amount: '3' }));

    expect(mockUpsertEntity).toHaveBeenCalledWith(
      { partitionKey: 'guild1', rowKey: 'user2', score: 8 },
      'Replace'
    );
    expect(result.content).toContain('gave 3 karma to <@user2>');
    expect(result.content).toContain('**8**');
  });

  it('give defaults to amount 1 when not specified', async () => {
    mockGetEntity.mockResolvedValue({ partitionKey: 'guild1', rowKey: 'user2', score: 0 });

    const { default: plugin } = await import('../../../src/plugins/karma/index.js');
    const result = await plugin.execute(makeCtx('give', { user: 'user2' }));

    expect(mockUpsertEntity).toHaveBeenCalledWith(
      { partitionKey: 'guild1', rowKey: 'user2', score: 1 },
      'Replace'
    );
    expect(result.content).toContain('gave 1 karma to <@user2>');
  });

  it('take decreases target karma by specified amount', async () => {
    mockGetEntity.mockResolvedValue({ partitionKey: 'guild1', rowKey: 'user2', score: 10 });

    const { default: plugin } = await import('../../../src/plugins/karma/index.js');
    const result = await plugin.execute(makeCtx('take', { user: 'user2', amount: '4' }));

    expect(mockUpsertEntity).toHaveBeenCalledWith(
      { partitionKey: 'guild1', rowKey: 'user2', score: 6 },
      'Replace'
    );
    expect(result.content).toContain('took 4 karma from <@user2>');
    expect(result.content).toContain('**6**');
  });

  it('give to self returns ephemeral error', async () => {
    const { default: plugin } = await import('../../../src/plugins/karma/index.js');
    const result = await plugin.execute(makeCtx('give', { user: 'user1' }, 'user1'));

    expect(result.ephemeral).toBe(true);
    expect(result.content).toContain("can't give karma to yourself");
    expect(mockUpsertEntity).not.toHaveBeenCalled();
  });

  it('take from self returns ephemeral error', async () => {
    const { default: plugin } = await import('../../../src/plugins/karma/index.js');
    const result = await plugin.execute(makeCtx('take', { user: 'user1' }, 'user1'));

    expect(result.ephemeral).toBe(true);
    expect(result.content).toContain("can't give karma to yourself");
    expect(mockUpsertEntity).not.toHaveBeenCalled();
  });

  it('show with user arg returns that user score', async () => {
    mockGetEntity.mockResolvedValue({ partitionKey: 'guild1', rowKey: 'user2', score: 42 });

    const { default: plugin } = await import('../../../src/plugins/karma/index.js');
    const result = await plugin.execute(makeCtx('show', { user: 'user2' }));

    expect(result.content).toContain('<@user2>');
    expect(result.content).toContain('**42**');
  });

  it('show without user arg returns invoker score', async () => {
    mockGetEntity.mockResolvedValue({ partitionKey: 'guild1', rowKey: 'user1', score: 7 });

    const { default: plugin } = await import('../../../src/plugins/karma/index.js');
    const result = await plugin.execute(makeCtx('show', {}));

    expect(result.content).toContain('<@user1>');
    expect(result.content).toContain('**7**');
  });

  it('show returns 0 when entity does not exist', async () => {
    // mockGetEntity already rejects by default in beforeEach

    const { default: plugin } = await import('../../../src/plugins/karma/index.js');
    const result = await plugin.execute(makeCtx('show', { user: 'user2' }));

    expect(result.content).toContain('<@user2>');
    expect(result.content).toContain('**0**');
  });

  it('board returns sorted leaderboard', async () => {
    async function* fakeEntities() {
      yield { partitionKey: 'guild1', rowKey: 'userA', score: 5 };
      yield { partitionKey: 'guild1', rowKey: 'userB', score: 20 };
      yield { partitionKey: 'guild1', rowKey: 'userC', score: 10 };
    }
    mockListEntities.mockReturnValue(fakeEntities());

    const { default: plugin } = await import('../../../src/plugins/karma/index.js');
    const result = await plugin.execute(makeCtx('board'));

    expect(result.content).toContain('Leaderboard');
    const lines = result.content.split('\n');
    expect(lines[1]).toContain('userB');
    expect(lines[2]).toContain('userC');
    expect(lines[3]).toContain('userA');
  });

  it('board with no entries returns empty message', async () => {
    // mockListEntities already returns empty by default in beforeEach

    const { default: plugin } = await import('../../../src/plugins/karma/index.js');
    const result = await plugin.execute(makeCtx('board'));

    expect(result.content).toBe('No karma recorded yet.');
  });

  describe('cooldown', () => {
    it('give on cooldown returns ephemeral error with remaining seconds', async () => {
      mockGetEntity.mockResolvedValue({ partitionKey: 'guild1', rowKey: 'user2', score: 0 });

      const { default: plugin } = await import('../../../src/plugins/karma/index.js');
      await plugin.execute(makeCtx('give', { user: 'user2' }));

      const result = await plugin.execute(makeCtx('give', { user: 'user2' }));

      expect(result.ephemeral).toBe(true);
      expect(result.content).toContain('cooldown');
      expect(result.content).toMatch(/\d+s/);
    });

    it('take on cooldown returns ephemeral error', async () => {
      mockGetEntity.mockResolvedValue({ partitionKey: 'guild1', rowKey: 'user2', score: 10 });

      const { default: plugin } = await import('../../../src/plugins/karma/index.js');
      await plugin.execute(makeCtx('take', { user: 'user2' }));

      const result = await plugin.execute(makeCtx('take', { user: 'user2' }));

      expect(result.ephemeral).toBe(true);
      expect(result.content).toContain('cooldown');
    });

    it('cooldown does not apply to show', async () => {
      mockGetEntity.mockResolvedValue({ partitionKey: 'guild1', rowKey: 'user2', score: 5 });

      const { default: plugin } = await import('../../../src/plugins/karma/index.js');
      await plugin.execute(makeCtx('give', { user: 'user2' }));

      const result = await plugin.execute(makeCtx('show', { user: 'user2' }));

      expect(result.content).toContain('**5**');
      expect(result.ephemeral).not.toBe(true);
    });

    it('cooldown does not apply to board', async () => {
      mockGetEntity.mockResolvedValue({ partitionKey: 'guild1', rowKey: 'user2', score: 5 });

      const { default: plugin } = await import('../../../src/plugins/karma/index.js');
      await plugin.execute(makeCtx('give', { user: 'user2' }));

      const result = await plugin.execute(makeCtx('board'));

      expect(result.content).not.toContain('cooldown');
      expect(result.ephemeral).not.toBe(true);
    });

    it('cooldown expires after COOLDOWN_MS — second give succeeds', async () => {
      mockGetEntity.mockResolvedValue({ partitionKey: 'guild1', rowKey: 'user2', score: 0 });

      const { default: plugin } = await import('../../../src/plugins/karma/index.js');
      await plugin.execute(makeCtx('give', { user: 'user2' }));

      vi.setSystemTime(testBaseTime + 60_001);

      const result = await plugin.execute(makeCtx('give', { user: 'user2' }));

      expect(result.content).toContain('gave');
      expect(result.ephemeral).not.toBe(true);
    });

    it('different users are not affected by each other\'s cooldowns', async () => {
      mockGetEntity.mockResolvedValue({ partitionKey: 'guild1', rowKey: 'user2', score: 0 });

      const { default: plugin } = await import('../../../src/plugins/karma/index.js');
      await plugin.execute(makeCtx('give', { user: 'user2' }, 'user1'));

      const result = await plugin.execute(makeCtx('give', { user: 'user2' }, 'user3'));

      expect(result.content).toContain('gave');
      expect(result.ephemeral).not.toBe(true);
    });
  });
});
