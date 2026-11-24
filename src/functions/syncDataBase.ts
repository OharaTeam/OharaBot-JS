import type { Guild, User } from 'discord.js';
import { logger } from '@/utils/logger';
import { getApiDestination, type SyncTarget } from '@/utils/apiDestination';
import { getErrorMessage } from '@/utils/errors';
import type { GuildMemberSyncData } from '@/types/sync';

// Função auxiliar para evitar Rate Limit (espera X ms)
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function sendBatchToDatabase(
  data: GuildMemberSyncData[],
  currentBatch: number,
  totalBatches: number,
  target?: SyncTarget
): Promise<void> {
  const backEndUrl = getApiDestination('membros', target);

  logger.debug(`Enviando lote ${currentBatch}/${totalBatches} com ${data.length} membros para: ${backEndUrl}`);
  const response = await fetch(backEndUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.BOT_KEY || '',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha no pacote ${currentBatch}: Status ${response.status} - ${errorText}`);
  }
}

export async function syncGuildMembers(guild: Guild, batchSize = 15, target?: SyncTarget): Promise<number> {
  try {
    const members = await guild.members.fetch();
    logger.info(
      `Iniciando sincronização de MEMBROS do servidor: ${guild.name}, ${members.size} Membros encontrados. ATENÇÃO: Isso pode demorar para coletar os banners.`
    );

    const allMembersData: GuildMemberSyncData[] = [];
    let count = 0;

    for (const member of members.values()) {
      let fullUser: User;
      try {
        fullUser = await guild.client.users.fetch(member.user.id, { force: true });
      } catch (err) {
        logger.warn(`Não foi possível buscar detalhes do user ${member.user.tag}: ${getErrorMessage(err)}`);
        fullUser = member.user;
      }

      const memberPayload: GuildMemberSyncData = {
        discordId: fullUser.id,
        username: fullUser.username,
        globalName: fullUser.globalName,
        serverNickName: member.nickname,
        avatarUrl: fullUser.displayAvatarURL({ forceStatic: false, size: 512 }),
        serverAvatarUrl: member.avatarURL({ forceStatic: false, size: 512 }),
        bannerUrl: fullUser.bannerURL({ forceStatic: false, size: 512 }) || null,
        serverBannerUrl: member.bannerURL({ forceStatic: false, size: 512 }) || null,
        isBot: fullUser.bot,
        colorHex: member.displayHexColor,
        rolesIds: member.roles.cache.filter((role) => role.id !== guild.id).map((role) => role.id),
        accountCreatedAt: fullUser.createdAt.toISOString(),
        joinedServerAt: member.joinedAt ? member.joinedAt.toISOString() : null,
        premiumSince: member.premiumSince ? member.premiumSince.toISOString() : null,
      };

      allMembersData.push(memberPayload);
      count++;

      if (count % 10 === 0) {
        logger.debug(`Processados ${count}/${members.size} usuários...`);
      }
      await sleep(200);
    }

    const totalBatches = Math.ceil(allMembersData.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = start + batchSize;
      const batch = allMembersData.slice(start, end);

      await sendBatchToDatabase(batch, i + 1, totalBatches, target);
    }
    logger.info('✅ Sincronização de membros finalizada com sucesso.');
    return allMembersData.length;
  } catch (error) {
    logger.error(`Erro ao sincronizar membros: ${getErrorMessage(error)}`);
    return 0;
  }
}
