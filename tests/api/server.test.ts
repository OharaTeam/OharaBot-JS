import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import type { AddressInfo } from 'node:net';
import type { Client, Guild } from 'discord.js';
import logger from '@/utils/logger';
import { createMockLogger } from '../helpers/mockLogger';

// Mocks para as funções de sincronização antes de importar startServer
const mockSyncGuildRoles = mock(async (_guild: Guild) => 8);
const mockSyncGuildMembers = mock(async (_guild: Guild) => 42);

mock.module('@/functions/syncRoles', () => ({
  syncGuildRoles: mockSyncGuildRoles,
}));

mock.module('@/functions/syncDataBase', () => ({
  syncGuildMembers: mockSyncGuildMembers,
}));

// Importa startServer após mock.module
const { startServer } = await import('@/api/server');

describe('API Server (Express)', () => {
  let mockLoggerHelper: ReturnType<typeof createMockLogger>;
  const originalBotKey = process.env.BOT_KEY;
  const originalOharaId = process.env.OHARA_ID;
  const originalPort = process.env.PORT;

  let activeApp: ReturnType<typeof startServer> | null = null;
  let baseUrl = '';

  beforeEach(() => {
    mockLoggerHelper = createMockLogger(logger);
    process.env.BOT_KEY = 'valid-test-bot-key';
    process.env.OHARA_ID = 'ohara-test-guild';
    process.env.PORT = '0'; // Porta dinâmica alocada pelo SO

    mockSyncGuildRoles.mockReset();
    mockSyncGuildMembers.mockReset();
    mockSyncGuildRoles.mockImplementation(async () => 8);
    mockSyncGuildMembers.mockImplementation(async () => 42);
  });

  afterEach(async () => {
    mockLoggerHelper.restore();

    if (activeApp?.httpServer) {
      const server = activeApp.httpServer;
      if (server.listening) {
        await new Promise<void>((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()));
        });
      }
      activeApp = null;
    }

    if (originalBotKey !== undefined) {
      process.env.BOT_KEY = originalBotKey;
    } else {
      delete process.env.BOT_KEY;
    }

    if (originalOharaId !== undefined) {
      process.env.OHARA_ID = originalOharaId;
    } else {
      delete (process.env as Record<string, string | undefined>).OHARA_ID;
    }

    if (originalPort !== undefined) {
      process.env.PORT = originalPort;
    } else {
      delete process.env.PORT;
    }
  });

  async function startTestServer(mockClient: Client): Promise<string> {
    activeApp = startServer(mockClient);
    const server = activeApp.httpServer;

    if (!server?.listening) {
      await new Promise<void>((resolve) => server?.once('listening', resolve));
    }

    const addr = server?.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
    return baseUrl;
  }

  it('GET / deve ser público e responder com status 200 e texto "OharaBot API ok!" sem credenciais', async () => {
    const mockClient = { guilds: { fetch: mock() } } as unknown as Client;
    const url = await startTestServer(mockClient);

    const response = await fetch(`${url}/`);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toBe('OharaBot API ok!');
  });

  it('POST /sincronizar-dados deve rejeitar com 401 Unauthorized se nenhuma autenticação for fornecida', async () => {
    const mockClient = { guilds: { fetch: mock() } } as unknown as Client;
    const url = await startTestServer(mockClient);

    const response = await fetch(`${url}/sincronizar-dados`, {
      method: 'POST',
    });
    const body = (await response.json()) as { error: string; message: string };

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: 'Unauthorized',
      message: 'API key inválida ou ausente.',
    });
  });

  it('POST /sincronizar-dados deve rejeitar com 401 Unauthorized se chave for inválida', async () => {
    const mockClient = { guilds: { fetch: mock() } } as unknown as Client;
    const url = await startTestServer(mockClient);

    const response = await fetch(`${url}/sincronizar-dados`, {
      method: 'POST',
      headers: {
        'x-api-key': 'chave-incorreta',
      },
    });
    const body = (await response.json()) as { error: string; message: string };

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: 'Unauthorized',
      message: 'API key inválida ou ausente.',
    });
  });

  it('POST /sincronizar-dados deve retornar 500 fail-closed se BOT_KEY não estiver configurada no ambiente', async () => {
    delete process.env.BOT_KEY;
    const mockClient = { guilds: { fetch: mock() } } as unknown as Client;
    const url = await startTestServer(mockClient);

    const response = await fetch(`${url}/sincronizar-dados`, {
      method: 'POST',
      headers: {
        'x-api-key': 'qualquer-chave',
      },
    });
    const body = (await response.json()) as { error: string; message: string };

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: 'Internal Server Error',
      message: 'Servidor mal configurado: chave de autenticação ausente.',
    });
  });

  it('POST /sincronizar-dados deve retornar 503 Service Unavailable se a guilda estiver inacessível', async () => {
    const mockClient = {
      guilds: {
        fetch: mock(async () => {
          throw new Error('Discord API 500 Service Unavailable');
        }),
      },
    } as unknown as Client;
    const url = await startTestServer(mockClient);

    const response = await fetch(`${url}/sincronizar-dados`, {
      method: 'POST',
      headers: {
        'x-api-key': 'valid-test-bot-key',
      },
    });
    const body = (await response.json()) as { error: string; message: string };

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: 'Service Unavailable',
      message: 'Não foi possível conectar à guilda no Discord',
    });
    expect(mockLoggerHelper.spies.warn).toHaveBeenCalled();
  });

  it('POST /sincronizar-dados deve retornar 200 OK com contadores de cargos e membros quando sincronizar com sucesso via x-api-key', async () => {
    const mockGuild = { id: 'ohara-test-guild', name: 'Ohara' } as unknown as Guild;
    const mockClient = {
      guilds: {
        fetch: mock(async () => mockGuild),
      },
    } as unknown as Client;
    const url = await startTestServer(mockClient);

    const response = await fetch(`${url}/sincronizar-dados`, {
      method: 'POST',
      headers: {
        'x-api-key': 'valid-test-bot-key',
      },
    });
    const body = (await response.json()) as {
      message: string;
      rolesProcessed: number;
      membersProcessed: number;
    };

    expect(response.status).toBe(200);
    expect(body).toEqual({
      message: 'Dados sincronizados com sucesso',
      rolesProcessed: 8,
      membersProcessed: 42,
    });
    expect(mockSyncGuildRoles).toHaveBeenCalledWith(mockGuild);
    expect(mockSyncGuildMembers).toHaveBeenCalledWith(mockGuild);
  });

  it('POST /sincronizar-dados deve aceitar autenticação via Authorization: Bearer <key>', async () => {
    const mockGuild = { id: 'ohara-test-guild', name: 'Ohara' } as unknown as Guild;
    const mockClient = {
      guilds: {
        fetch: mock(async () => mockGuild),
      },
    } as unknown as Client;
    const url = await startTestServer(mockClient);

    const response = await fetch(`${url}/sincronizar-dados`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-test-bot-key',
      },
    });
    const body = (await response.json()) as {
      message: string;
      rolesProcessed: number;
      membersProcessed: number;
    };

    expect(response.status).toBe(200);
    expect(body).toEqual({
      message: 'Dados sincronizados com sucesso',
      rolesProcessed: 8,
      membersProcessed: 42,
    });
  });

  it('POST /sincronizar-dados deve retornar 500 se ocorrer erro durante a rotina de sincronização', async () => {
    mockSyncGuildRoles.mockImplementationOnce(async () => {
      throw new Error('Falha ao processar roles no banco de dados');
    });

    const mockGuild = { id: 'ohara-test-guild', name: 'Ohara' } as unknown as Guild;
    const mockClient = {
      guilds: {
        fetch: mock(async () => mockGuild),
      },
    } as unknown as Client;
    const url = await startTestServer(mockClient);

    const response = await fetch(`${url}/sincronizar-dados`, {
      method: 'POST',
      headers: {
        'x-api-key': 'valid-test-bot-key',
      },
    });
    const body = (await response.json()) as { error: string; message: string };

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: 'Internal Server Error',
      message: 'Erro ao sincronizar dados',
    });
    expect(mockLoggerHelper.spies.error).toHaveBeenCalled();
  });
});
