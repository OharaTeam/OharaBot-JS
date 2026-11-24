import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import path from 'node:path';
import fs from 'node:fs';
import type { ChatInputCommandInteraction, Guild, Client } from 'discord.js';
import logger from '@/utils/logger';
import { createMockLogger } from '../../helpers/mockLogger';

// Mocks para as dependências antes de importar o comando
const mockCheckAdmin = mock(async (_interaction: ChatInputCommandInteraction) => true);
const mockSyncGuildRoles = mock(async (_guild: Guild, _target?: 'local' | 'producao') => 5);
const mockSyncGuildMembers = mock(async (_guild: Guild, _batchSize = 15, _target?: 'local' | 'producao') => 20);
const mockGetOharaGuild = mock(
  async (_client: Client) =>
    ({
      id: 'fallback-ohara-guild',
      name: 'Ohara Fallback',
      roles: { cache: new Map([['1', {}]]) },
    }) as unknown as Guild
);

mock.module('@/functions/checkAdmin', () => ({
  checkAdmin: mockCheckAdmin,
}));

mock.module('@/functions/syncRoles', () => ({
  syncGuildRoles: mockSyncGuildRoles,
}));

mock.module('@/functions/syncDataBase', () => ({
  syncGuildMembers: mockSyncGuildMembers,
}));

mock.module('@/utils/resolveGuild', () => ({
  getOharaGuild: mockGetOharaGuild,
}));

// Importa o comando após configuração dos mocks
const { default: command } = await import('@/commands/admin/sincronizar-dados');

describe('Comando /sincronizar-dados', () => {
  let mockLoggerHelper: ReturnType<typeof createMockLogger>;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mockLoggerHelper = createMockLogger(logger);
    mockCheckAdmin.mockReset();
    mockSyncGuildRoles.mockReset();
    mockSyncGuildMembers.mockReset();
    mockGetOharaGuild.mockReset();

    mockCheckAdmin.mockImplementation(async () => true);
    mockSyncGuildRoles.mockImplementation(async () => 5);
    mockSyncGuildMembers.mockImplementation(async () => 20);
    mockGetOharaGuild.mockImplementation(
      async () =>
        ({
          id: 'fallback-ohara-guild',
          name: 'Ohara Fallback',
          roles: { cache: new Map([['1', {}]]) },
        }) as unknown as Guild
    );
  });

  afterEach(() => {
    mockLoggerHelper.restore();
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  describe('Definição do comando e compatibilidade com /reload', () => {
    it('deve possuir nome canônico estático "sincronizar-dados" e cooldown 300', () => {
      expect(command.data.name).toBe('sincronizar-dados');
      expect(command.cooldown).toBe(300);
      expect(command.data.description).toContain('Sincroniza cargos e membros');
    });

    it('deve possuir subcomandos estruturados "local" e "producao"', () => {
      const options = command.data.options;
      const subcommands = options.map((opt: unknown) => {
        const json = (opt as { toJSON: () => { name: string; description: string } }).toJSON();
        return json.name;
      });

      expect(subcommands).toContain('local');
      expect(subcommands).toContain('producao');
      expect(subcommands.length).toBe(2);
    });

    it('deve possuir nome de arquivo idêntico ao command.data.name para suportar o comando /reload', () => {
      const filePath = path.resolve(import.meta.dirname, '../../../src/commands/admin/sincronizar-dados.ts');
      expect(fs.existsSync(filePath)).toBe(true);

      const baseName = path.basename(filePath, '.ts');
      expect(baseName).toBe(command.data.name);

      // Garante que o arquivo legado syncData.ts não existe mais
      const legacyPath = path.resolve(import.meta.dirname, '../../../src/commands/admin/syncData.ts');
      expect(fs.existsSync(legacyPath)).toBe(false);
    });
  });

  describe('Fluxo de execução e permissões', () => {
    function createMockInteraction(subcommand: 'local' | 'producao', guild: Guild | null = null) {
      const deferReplyMock = mock(async (_opts?: unknown) => {});
      const editReplyMock = mock(async (_opts?: unknown) => {});

      const mockGuild =
        guild !== null
          ? guild
          : ({
              id: 'guild-123',
              name: 'Ohara Community',
              roles: {
                cache: new Map([
                  ['1', { id: 'role-1' }],
                  ['2', { id: 'role-2' }],
                ]),
              },
            } as unknown as Guild);

      const interaction = {
        options: {
          getSubcommand: mock(() => subcommand),
        },
        guild: mockGuild,
        client: {
          guilds: {
            fetch: mock(),
          },
        } as unknown as Client,
        deferReply: deferReplyMock,
        editReply: editReplyMock,
      } as unknown as ChatInputCommandInteraction;

      return { interaction, deferReplyMock, editReplyMock, mockGuild };
    }

    it('deve abortar imediatamente se checkAdmin retornar false sem emitir deferReply', async () => {
      mockCheckAdmin.mockImplementationOnce(async () => false);
      const { interaction, deferReplyMock } = createMockInteraction('local');

      await command.execute(interaction);

      expect(mockCheckAdmin).toHaveBeenCalledWith(interaction);
      expect(deferReplyMock).not.toHaveBeenCalled();
      expect(mockSyncGuildRoles).not.toHaveBeenCalled();
      expect(mockSyncGuildMembers).not.toHaveBeenCalled();
    });

    it('deve responder com deferReply efêmero e executar sincronização com target="local"', async () => {
      const { interaction, deferReplyMock, editReplyMock, mockGuild } = createMockInteraction('local');

      await command.execute(interaction);

      expect(deferReplyMock).toHaveBeenCalledWith({ ephemeral: true });
      expect(mockSyncGuildRoles).toHaveBeenCalledWith(mockGuild, 'local');
      expect(mockSyncGuildMembers).toHaveBeenCalledWith(mockGuild, 15, 'local');

      // Verifica feedback inicial e final de sucesso
      expect(editReplyMock).toHaveBeenCalledWith(
        '🔄 Iniciando sincronização [Local (localhost:3000)]... Acompanhe no console.'
      );
      expect(editReplyMock).toHaveBeenCalledWith(
        '✅ [Local (localhost:3000)] Dados de **20** membros e **5** cargos processados com sucesso.'
      );
    });

    it('deve executar sincronização com target="producao"', async () => {
      const { interaction, deferReplyMock, editReplyMock, mockGuild } = createMockInteraction('producao');

      await command.execute(interaction);

      expect(deferReplyMock).toHaveBeenCalledWith({ ephemeral: true });
      expect(mockSyncGuildRoles).toHaveBeenCalledWith(mockGuild, 'producao');
      expect(mockSyncGuildMembers).toHaveBeenCalledWith(mockGuild, 15, 'producao');

      expect(editReplyMock).toHaveBeenCalledWith(
        '✅ [Produção] Dados de **20** membros e **5** cargos processados com sucesso.'
      );
    });

    it('deve resolver guilda defensivamente via getOharaGuild quando interaction.guild for nulo', async () => {
      const { interaction, deferReplyMock, editReplyMock } = createMockInteraction('local');
      // Força interaction.guild a ser indefinido
      Object.defineProperty(interaction, 'guild', { value: undefined });

      await command.execute(interaction);

      expect(deferReplyMock).toHaveBeenCalledWith({ ephemeral: true });
      expect(mockGetOharaGuild).toHaveBeenCalledWith(interaction.client);
      expect(mockSyncGuildRoles).toHaveBeenCalled();
      expect(mockSyncGuildMembers).toHaveBeenCalled();
      expect(editReplyMock).toHaveBeenCalledWith(
        '✅ [Local (localhost:3000)] Dados de **20** membros e **5** cargos processados com sucesso.'
      );
    });

    it('deve abortar a sincronização de membros se a sincronização de cargos retornar 0 com cargos existentes na guilda', async () => {
      mockSyncGuildRoles.mockImplementationOnce(async () => 0);
      const { interaction, editReplyMock } = createMockInteraction('local');

      await command.execute(interaction);

      expect(mockSyncGuildRoles).toHaveBeenCalled();
      expect(mockSyncGuildMembers).not.toHaveBeenCalled();
      expect(editReplyMock).toHaveBeenCalledWith(
        '⚠️ Atenção: Sincronização de cargos falhou ou retornou 0. A sincronização de membros foi abortada para evitar erros.'
      );
    });

    it('não deve abortar a sincronização de membros se a guilda possuir apenas o cargo @everyone e rolesProcessed for 0', async () => {
      mockSyncGuildRoles.mockImplementationOnce(async () => 0);
      mockSyncGuildMembers.mockImplementationOnce(async () => 10);
      const onlyEveryoneGuild = {
        id: 'guild-123',
        name: 'Ohara Community',
        roles: {
          cache: new Map([['guild-123', { id: 'guild-123', name: '@everyone' }]]),
        },
      } as unknown as Guild;

      const { interaction, editReplyMock } = createMockInteraction('local', onlyEveryoneGuild);

      await command.execute(interaction);

      expect(mockSyncGuildRoles).toHaveBeenCalled();
      expect(mockSyncGuildMembers).toHaveBeenCalled();
      expect(editReplyMock).toHaveBeenCalledWith(
        '✅ [Local (localhost:3000)] Dados de **10** membros e **0** cargos processados com sucesso.'
      );
    });

    it('deve exibir mensagem de falha se syncGuildMembers retornar 0 membros processados', async () => {
      mockSyncGuildMembers.mockImplementationOnce(async () => 0);
      const { interaction, editReplyMock } = createMockInteraction('local');

      await command.execute(interaction);

      expect(editReplyMock).toHaveBeenCalledWith(
        '❌ [Local (localhost:3000)] Falha na sincronização. Verifique os logs.'
      );
    });

    it('deve capturar erros na execução, logar no Winston e notificar o usuário com editReply', async () => {
      mockSyncGuildRoles.mockImplementationOnce(async () => {
        throw new Error('Falha de conexão com o banco de dados');
      });
      const { interaction, editReplyMock } = createMockInteraction('producao');

      await command.execute(interaction);

      expect(mockLoggerHelper.spies.error).toHaveBeenCalled();
      expect(editReplyMock).toHaveBeenCalledWith(
        '❌ Erro durante a sincronização: Falha de conexão com o banco de dados'
      );
    });
  });
});
