import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Events, type GuildMember } from 'discord.js';
import logger from '@/utils/logger';
import { createMockLogger } from '../helpers/mockLogger';
import * as syncDataBaseModule from '@/functions/syncDataBase';
import guildMemberUpdateEvent from '@/events/guildMemberUpdate';

function createMockMember(overrides?: {
  guildId?: string;
  userId?: string;
  bot?: boolean;
  pending?: boolean | null;
  hasKaizokuRole?: boolean;
  extraRoles?: string[];
  rolesAddError?: Error;
}) {
  const guildId = overrides?.guildId ?? 'mock-ohara-id';
  const kaizokuRoleId = process.env.KAIZOKU_ROLE_ID ?? 'mock-kaizoku-role-id';
  const roleIds = new Set<string>([guildId, ...(overrides?.extraRoles ?? [])]);
  if (overrides?.hasKaizokuRole) {
    roleIds.add(kaizokuRoleId);
  }

  const addRoleMock = mock(async (roleId: string, _reason?: string) => {
    if (overrides?.rolesAddError) {
      throw overrides.rolesAddError;
    }
    roleIds.add(roleId);
    return member;
  });

  const user = {
    id: overrides?.userId ?? 'user-123',
    username: 'luffy',
    tag: 'luffy#0001',
    globalName: 'Monkey D. Luffy',
    bot: overrides?.bot ?? false,
    createdAt: new Date('2020-01-01T00:00:00.000Z'),
    displayAvatarURL: mock(() => 'https://cdn.discordapp.com/avatars/user-123.png'),
    bannerURL: mock(() => null),
  };

  const member = {
    id: overrides?.userId ?? 'user-123',
    pending: overrides?.pending,
    nickname: 'Luffy',
    displayHexColor: '#ff0000',
    joinedAt: new Date('2026-11-24T12:00:00.000Z'),
    premiumSince: null,
    guild: {
      id: guildId,
      name: 'Ohara',
      client: {
        users: {
          fetch: mock(async () => user),
        },
      },
    },
    user,
    avatarURL: mock(() => null),
    bannerURL: mock(() => null),
    roles: {
      cache: {
        has: (id: string) => roleIds.has(id),
        filter: (predicate: (role: { id: string }) => boolean) => {
          const filtered = [...roleIds].map((id) => ({ id })).filter(predicate);
          return {
            map: <T>(mapper: (role: { id: string }) => T) => filtered.map(mapper),
          };
        },
      },
      add: addRoleMock,
    },
  } as unknown as GuildMember;

  return { member, addRoleMock, roleIds };
}

describe('evento guildMemberUpdate', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalOharaId = process.env.OHARA_ID;
  const originalKaizokuRoleId = process.env.KAIZOKU_ROLE_ID;
  const originalBotKey = process.env.BOT_KEY;

  let mockLoggerHelper: ReturnType<typeof createMockLogger>;
  let fetchSpy: ReturnType<typeof spyOn>;
  let syncSingleMemberSpy: ReturnType<typeof spyOn> | null = null;

  beforeEach(() => {
    mockLoggerHelper = createMockLogger(logger);
    process.env.NODE_ENV = 'development';
    process.env.OHARA_ID = 'mock-ohara-id';
    process.env.KAIZOKU_ROLE_ID = 'mock-kaizoku-role-id';
    process.env.BOT_KEY = 'mock-bot-key';

    fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
      (async () => new Response(JSON.stringify({ ok: true }), { status: 200 })) as unknown as typeof fetch
    );
  });

  afterEach(() => {
    mockLoggerHelper.restore();
    fetchSpy.mockRestore();
    if (syncSingleMemberSpy) {
      syncSingleMemberSpy.mockRestore();
      syncSingleMemberSpy = null;
    }

    if (originalEnv !== undefined) {
      process.env.NODE_ENV = originalEnv;
    } else {
      delete (process.env as Record<string, string | undefined>).NODE_ENV;
    }

    if (originalOharaId !== undefined) {
      process.env.OHARA_ID = originalOharaId;
    } else {
      delete (process.env as Record<string, string | undefined>).OHARA_ID;
    }

    if (originalKaizokuRoleId !== undefined) {
      process.env.KAIZOKU_ROLE_ID = originalKaizokuRoleId;
    } else {
      delete (process.env as Record<string, string | undefined>).KAIZOKU_ROLE_ID;
    }

    if (originalBotKey !== undefined) {
      process.env.BOT_KEY = originalBotKey;
    } else {
      delete (process.env as Record<string, string | undefined>).BOT_KEY;
    }
  });

  it('deve expor metadados corretos do evento GuildMemberUpdate', () => {
    expect(guildMemberUpdateEvent.name).toBe(Events.GuildMemberUpdate);
    expect(guildMemberUpdateEvent.once).toBe(false);
    expect(typeof guildMemberUpdateEvent.execute).toBe('function');
  });

  it('deve conceder o cargo Kaizoku e sincronizar o membro via POST /membros na conclusão do Membership Screening (tracer)', async () => {
    const { member: oldMember } = createMockMember({ pending: true, hasKaizokuRole: false });
    const { member: newMember, addRoleMock } = createMockMember({ pending: false, hasKaizokuRole: false });

    await guildMemberUpdateEvent.execute(oldMember, newMember);

    expect(addRoleMock).toHaveBeenCalledTimes(1);
    expect(addRoleMock).toHaveBeenCalledWith('mock-kaizoku-role-id', 'Onboarding concluído (aceite de regras)');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3000/membros');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      'x-api-key': 'mock-bot-key',
    });

    const payload = JSON.parse(init.body as string);
    expect(Array.isArray(payload)).toBe(true);
    expect(payload).toHaveLength(1);
    expect(payload[0]).toMatchObject({
      discordId: 'user-123',
      username: 'luffy',
      globalName: 'Monkey D. Luffy',
      serverNickName: 'Luffy',
      isBot: false,
      rolesIds: ['mock-kaizoku-role-id'],
    });
    expect(mockLoggerHelper.spies.info).toHaveBeenCalled();
  });

  it('deve ignorar eventos originados de outras guildas diferentes de OHARA_ID', async () => {
    syncSingleMemberSpy = spyOn(syncDataBaseModule, 'syncSingleMember');
    const { member: oldMember } = createMockMember({ guildId: 'other-guild', pending: true });
    const { member: newMember, addRoleMock } = createMockMember({ guildId: 'other-guild', pending: false });

    await guildMemberUpdateEvent.execute(oldMember, newMember);

    expect(addRoleMock).not.toHaveBeenCalled();
    expect(syncSingleMemberSpy).not.toHaveBeenCalled();
  });

  it('deve ignorar contas de bot mesmo durante transição de pending', async () => {
    syncSingleMemberSpy = spyOn(syncDataBaseModule, 'syncSingleMember');
    const { member: oldMember } = createMockMember({ bot: true, pending: true });
    const { member: newMember, addRoleMock } = createMockMember({ bot: true, pending: false });

    await guildMemberUpdateEvent.execute(oldMember, newMember);

    expect(addRoleMock).not.toHaveBeenCalled();
    expect(syncSingleMemberSpy).not.toHaveBeenCalled();
  });

  it('deve ignorar atualizações que não representam transição pending true -> false', async () => {
    syncSingleMemberSpy = spyOn(syncDataBaseModule, 'syncSingleMember');
    const transitions: Array<{ oldPending: boolean | null | undefined; newPending: boolean }> = [
      { oldPending: false, newPending: false },
      { oldPending: true, newPending: true },
      { oldPending: false, newPending: true },
      { oldPending: null, newPending: false },
      { oldPending: undefined, newPending: false },
    ];

    for (const { oldPending, newPending } of transitions) {
      const { member: oldMember } = createMockMember({ pending: oldPending });
      const { member: newMember, addRoleMock } = createMockMember({ pending: newPending });

      await guildMemberUpdateEvent.execute(oldMember, newMember);

      expect(addRoleMock).not.toHaveBeenCalled();
      expect(syncSingleMemberSpy).not.toHaveBeenCalled();
    }
  });

  it('deve registrar logger.error e abortar quando KAIZOKU_ROLE_ID estiver ausente no ambiente', async () => {
    syncSingleMemberSpy = spyOn(syncDataBaseModule, 'syncSingleMember');
    delete (process.env as Record<string, string | undefined>).KAIZOKU_ROLE_ID;

    const { member: oldMember } = createMockMember({ pending: true });
    const { member: newMember, addRoleMock } = createMockMember({ pending: false });

    await guildMemberUpdateEvent.execute(oldMember, newMember);

    expect(mockLoggerHelper.spies.error).toHaveBeenCalled();
    expect(addRoleMock).not.toHaveBeenCalled();
    expect(syncSingleMemberSpy).not.toHaveBeenCalled();
  });

  it('deve ser idempotente: não chamar roles.add quando o membro já possuir o cargo Kaizoku, mas sincronizar na API', async () => {
    syncSingleMemberSpy = spyOn(syncDataBaseModule, 'syncSingleMember').mockResolvedValue(undefined);
    const { member: oldMember } = createMockMember({ pending: true, hasKaizokuRole: true });
    const { member: newMember, addRoleMock } = createMockMember({ pending: false, hasKaizokuRole: true });

    await guildMemberUpdateEvent.execute(oldMember, newMember);

    expect(addRoleMock).not.toHaveBeenCalled();
    expect(mockLoggerHelper.spies.debug).toHaveBeenCalled();
    expect(syncSingleMemberSpy).toHaveBeenCalledTimes(1);
    expect(syncSingleMemberSpy).toHaveBeenCalledWith(newMember);
  });

  it('deve registrar logger.error e abortar sincronização se roles.add rejeitar por erro de permissão', async () => {
    syncSingleMemberSpy = spyOn(syncDataBaseModule, 'syncSingleMember');
    const { member: oldMember } = createMockMember({ pending: true });
    const { member: newMember, addRoleMock } = createMockMember({
      pending: false,
      rolesAddError: new Error('Missing Permissions'),
    });

    await guildMemberUpdateEvent.execute(oldMember, newMember);

    expect(addRoleMock).toHaveBeenCalledTimes(1);
    expect(mockLoggerHelper.spies.error).toHaveBeenCalled();
    expect(mockLoggerHelper.spies.error.mock.calls[0]?.[0]).toContain('Missing Permissions');
    expect(syncSingleMemberSpy).not.toHaveBeenCalled();
  });

  it('deve aplicar política fail-open (D-05): manter cargo Kaizoku concedido e logar logger.warn quando syncSingleMember falhar', async () => {
    syncSingleMemberSpy = spyOn(syncDataBaseModule, 'syncSingleMember').mockRejectedValue(
      new Error('Falha no pacote 1: Status 500 - Backend indisponível')
    );

    const { member: oldMember } = createMockMember({ pending: true, hasKaizokuRole: false });
    const { member: newMember, addRoleMock, roleIds } = createMockMember({ pending: false, hasKaizokuRole: false });

    await expect(guildMemberUpdateEvent.execute(oldMember, newMember)).resolves.toBeUndefined();

    expect(addRoleMock).toHaveBeenCalledTimes(1);
    expect(roleIds.has('mock-kaizoku-role-id')).toBe(true);
    expect(mockLoggerHelper.spies.warn).toHaveBeenCalledTimes(1);
    expect(mockLoggerHelper.spies.warn.mock.calls[0]?.[0]).toContain('Cargo Kaizoku mantido');
    expect(mockLoggerHelper.spies.warn.mock.calls[0]?.[0]).toContain('Status 500');
  });
});
