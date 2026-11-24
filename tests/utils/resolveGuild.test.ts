import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import type { Client, Guild } from 'discord.js';
import { getOharaGuild } from '@/utils/resolveGuild';
import logger from '@/utils/logger';
import { createMockLogger } from '../helpers/mockLogger';

describe('resolveGuild', () => {
  let mockLoggerHelper: ReturnType<typeof createMockLogger>;
  const originalOharaId = process.env.OHARA_ID;

  beforeEach(() => {
    mockLoggerHelper = createMockLogger(logger);
    process.env.OHARA_ID = 'guild-12345';
  });

  afterEach(() => {
    mockLoggerHelper.restore();
    if (originalOharaId !== undefined) {
      process.env.OHARA_ID = originalOharaId;
    } else {
      delete (process.env as Record<string, string | undefined>).OHARA_ID;
    }
  });

  it('deve resolver e retornar a guilda via client.guilds.fetch', async () => {
    const mockGuild = { id: 'guild-12345', name: 'Ohara' } as unknown as Guild;
    const fetchMock = mock(async (id: string) => (id === 'guild-12345' ? mockGuild : null));
    const mockClient = {
      guilds: {
        fetch: fetchMock,
      },
    } as unknown as Client;

    const guild = await getOharaGuild(mockClient);
    expect(guild).toBe(mockGuild);
    expect(fetchMock).toHaveBeenCalledWith('guild-12345');
  });

  it('deve lançar erro se OHARA_ID estiver ausente', async () => {
    delete (process.env as Record<string, string | undefined>).OHARA_ID;
    const mockClient = { guilds: { fetch: mock() } } as unknown as Client;

    await expect(getOharaGuild(mockClient)).rejects.toThrow('OHARA_ID não definido nas variáveis de ambiente.');
    expect(mockLoggerHelper.spies.error).toHaveBeenCalled();
  });

  it('deve lançar erro se OHARA_ID for string vazia ou em branco', async () => {
    process.env.OHARA_ID = '   ';
    const mockClient = { guilds: { fetch: mock() } } as unknown as Client;

    await expect(getOharaGuild(mockClient)).rejects.toThrow('OHARA_ID não definido nas variáveis de ambiente.');
    expect(mockLoggerHelper.spies.error).toHaveBeenCalled();
  });

  it('deve lançar erro se client.guilds.fetch retornar nulo', async () => {
    const mockClient = {
      guilds: {
        fetch: mock(async () => null),
      },
    } as unknown as Client;

    await expect(getOharaGuild(mockClient)).rejects.toThrow('Guilda com ID guild-12345 não encontrada no Discord.');
    expect(mockLoggerHelper.spies.error).toHaveBeenCalled();
  });

  it('deve repassar exceção e logar erro quando o fetch falhar', async () => {
    const mockClient = {
      guilds: {
        fetch: mock(async () => {
          throw new Error('Discord API 500');
        }),
      },
    } as unknown as Client;

    await expect(getOharaGuild(mockClient)).rejects.toThrow('Discord API 500');
    expect(mockLoggerHelper.spies.error).toHaveBeenCalled();
  });
});
