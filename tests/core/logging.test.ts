import { describe, it, expect, vi } from 'vitest';
import { getLogger } from '@sriram/logger';

describe('discord-bot logging', () => {
  it('getLogger is importable', () => {
    expect(typeof getLogger).toBe('function');
  });

  it('error log has required fields', () => {
    const writeSpy = vi.fn();
    const logger = getLogger('discord-bot', { write: writeSpy });
    logger.error({
      endpoint: '/command/karma',
      method: 'DISCORD',
      status: 500,
      message: 'handler crashed',
      error_type: 'Error',
      duration_ms: 0,
    });
    const entry = JSON.parse(writeSpy.mock.calls[0][0]);
    expect(entry.event).toBe('error');
    expect(entry.service).toBe('discord-bot');
  });
});
