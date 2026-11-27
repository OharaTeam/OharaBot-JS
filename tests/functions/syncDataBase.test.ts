import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import type { GuildMember } from 'discord.js';
import { extractMemberData, syncSingleMember } from '@/functions/syncDataBase';
import logger from '@/utils/logger';
import { createMockLogger } from '../helpers/mockLogger';

function createMockGuildMember(overrides?: {
  userFetchRejects?: boolean;
  joinedAt?: Date | null;
  premiumSince?: Date | null;
  bannerUrl?: string | null;
  serverBannerUrl?: string | null;
}) {
  const guildId = 'guild-ohara-123';
  const roleIds = [guildId, 'role-kaizoku', 'role-vip'];

  const memberUser = {
    id: 'user-999',
    username: 'zoro',
    tag: 'zoro#0001',
    globalName: 'Roronoa Zoro',
    bot: false,
    createdAt: new Date('2019-05-10T10:00:00.000Z'),
    displayAvatarURL: mock(() => 'https://cdn.discordapp.com/avatars/user-999-fallback.png'),
    bannerURL: mock(() => null),
  };

  const fullFetchedUser = {
    id: 'user-999',
    username: 'zoro',
    tag: 'zoro#0001',
    globalName: 'Roronoa Zoro',
    bot: false,
    createdAt: new Date('2019-05-10T10:00:00.000Z'),
    displayAvatarURL: mock(() => 'https://cdn.discordapp.com/avatars/user-999-full.png'),
    bannerURL: mock(() =>
      overrides?.bannerUrl !== undefined ? overrides.bannerUrl : 'https://cdn.discordapp.com/banners/user-999.png'
    ),
  };

  const usersFetchMock = overrides?.userFetchRejects
    ? mock(async () => {
        throw new Error('Discord User Fetch Timeout');
      })
    : mock(async () => fullFetchedUser);

  const member = {
    id: 'user-999',
    nickname: 'Caçador de Piratas',
    displayHexColor: '#00ff00',
    joinedAt: overrides?.joinedAt !== undefined ? overrides.joinedAt : new Date('2026-01-15T08:30:00.000Z'),
    premiumSince: overrides?.premiumSince !== undefined ? overrides.premiumSince : new Date('2026-02-01T12:00:00.000Z'),
    guild: {
      id: guildId,
      name: 'Ohara',
      client: {
        users: {
          fetch: usersFetchMock,
        },
      },
    },
    user: memberUser,
    avatarURL: mock(() => 'https://cdn.discordapp.com/guilds/guild-ohara-123/users/user-999/avatar.png'),
    bannerURL: mock(() => (overrides?.serverBannerUrl !== undefined ? overrides.serverBannerUrl : null)),
    roles: {
      cache: {
        filter: (predicate: (role: { id: string }) => boolean) => {
          const filtered = roleIds.map((id) => ({ id })).filter(predicate);
          return {
            map: <T>(mapper: (role: { id: string }) => T) => filtered.map(mapper),
          };
        },
      },
    },
  } as unknown as GuildMember;

  return { member, usersFetchMock, memberUser, fullFetchedUser };
}

describe('syncDataBase - extração e sincronização unitária', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalBackEndUrl = process.env.BACK_END_URL;
  const originalBotKey = process.env.BOT_KEY;

  let mockLoggerHelper: ReturnType<typeof createMockLogger>;
  let fetchSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mockLoggerHelper = createMockLogger(logger);
    process.env.NODE_ENV = 'development';
    process.env.BACK_END_URL = 'https://api.ohara.example.com';
    process.env.BOT_KEY = 'secret-bot-key';

    fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
      (async () => new Response(JSON.stringify({ ok: true }), { status: 200 })) as unknown as typeof fetch
    );
  });

  afterEach(() => {
    mockLoggerHelper.restore();
    fetchSpy.mockRestore();

    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }

    if (originalBackEndUrl !== undefined) {
      process.env.BACK_END_URL = originalBackEndUrl;
    } else {
      delete process.env.BACK_END_URL;
    }

    if (originalBotKey !== undefined) {
      process.env.BOT_KEY = originalBotKey;
    } else {
      delete process.env.BOT_KEY;
    }
  });

  it('extractMemberData deve buscar usuário com { force: true }, mapear todos os 14 campos e filtrar cargo @everyone', async () => {
    const { member, usersFetchMock } = createMockGuildMember();

    const payload = await extractMemberData(member);

    expect(usersFetchMock).toHaveBeenCalledTimes(1);
    expect(usersFetchMock).toHaveBeenCalledWith('user-999', { force: true });

    expect(payload).toEqual({
      discordId: 'user-999',
      username: 'zoro',
      globalName: 'Roronoa Zoro',
      serverNickName: 'Caçador de Piratas',
      avatarUrl: 'https://cdn.discordapp.com/avatars/user-999-full.png',
      serverAvatarUrl: 'https://cdn.discordapp.com/guilds/guild-ohara-123/users/user-999/avatar.png',
      bannerUrl: 'https://cdn.discordapp.com/banners/user-999.png',
      serverBannerUrl: null,
      isBot: false,
      colorHex: '#00ff00',
      rolesIds: ['role-kaizoku', 'role-vip'],
      accountCreatedAt: '2019-05-10T10:00:00.000Z',
      joinedServerAt: '2026-01-15T08:30:00.000Z',
      premiumSince: '2026-02-01T12:00:00.000Z',
    });
    expect(payload.rolesIds).not.toContain('guild-ohara-123');
  });

  it('extractMemberData deve aplicar fallback para member.user e registrar logger.warn quando users.fetch falhar', async () => {
    const { member } = createMockGuildMember({
      userFetchRejects: true,
      joinedAt: null,
      premiumSince: null,
    });

    const payload = await extractMemberData(member);

    expect(mockLoggerHelper.spies.warn).toHaveBeenCalledTimes(1);
    expect(mockLoggerHelper.spies.warn.mock.calls[0]?.[0]).toContain('Discord User Fetch Timeout');
    expect(payload.avatarUrl).toBe('https://cdn.discordapp.com/avatars/user-999-fallback.png');
    expect(payload.bannerUrl).toBeNull();
    expect(payload.joinedServerAt).toBeNull();
    expect(payload.premiumSince).toBeNull();
  });

  it('syncSingleMember deve enviar POST para destino local com array unitário [memberPayload] e x-api-key', async () => {
    const { member } = createMockGuildMember();

    await syncSingleMember(member, 'local');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3000/membros');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      'x-api-key': 'secret-bot-key',
    });

    const body = JSON.parse(init.body as string);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].discordId).toBe('user-999');
    expect(body[0].rolesIds).toEqual(['role-kaizoku', 'role-vip']);
  });

  it('syncSingleMember deve enviar POST para destino de produção quando target="producao" ou NODE_ENV="production"', async () => {
    const { member } = createMockGuildMember();

    await syncSingleMember(member, 'producao');
    expect((fetchSpy.mock.calls[0] as [string, RequestInit])[0]).toBe('https://api.ohara.example.com/membros');

    process.env.NODE_ENV = 'production';
    await syncSingleMember(member);
    expect((fetchSpy.mock.calls[1] as [string, RequestInit])[0]).toBe('https://api.ohara.example.com/membros');
  });

  it('syncSingleMember deve lançar erro descritivo com status HTTP quando response.ok for false', async () => {
    fetchSpy.mockImplementationOnce(
      (async () => new Response('Internal Database Error', { status: 500 })) as unknown as typeof fetch
    );
    const { member } = createMockGuildMember();

    await expect(syncSingleMember(member, 'local')).rejects.toThrow(
      'Falha no pacote 1: Status 500 - Internal Database Error'
    );
  });
});
