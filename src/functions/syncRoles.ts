import type { Guild } from 'discord.js';
import { logger } from '@/utils/logger';
import { getApiDestination } from '@/utils/apiDestination';
import { getErrorMessage } from '@/utils/errors';
import type { GuildRoleSyncData } from '@/types/sync';

async function sendRolesToDatabase(data: GuildRoleSyncData[]): Promise<void> {
  const backEndUrl = getApiDestination('cargos');
  logger.debug(`Enviando ${data.length} cargos para: ${backEndUrl}`);
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
    throw new Error(`API respondeu com status ${response.status}: ${errorText}`);
  }
  logger.debug('Sucesso! Back-end processou o lote de cargos.');
}

export async function syncGuildRoles(guild: Guild): Promise<number> {
  try {
    const roles = await guild.roles.fetch();
    logger.info(
      `Iniciando sincronização de CARGOS do servidor: ${guild.name}, ${roles.size} Cargos encontrados, processando...`
    );

    const allRolesData: GuildRoleSyncData[] = roles
      .filter((role) => role.id !== guild.id)
      .map((role) => ({
        discordId: role.id,
        name: role.name,
        colorHex: role.hexColor,
        position: role.position,
        permissions: role.permissions.bitfield.toString(),
        isManaged: role.managed,
        isMentionable: role.mentionable,
        isHoist: role.hoist,
      }));

    if (allRolesData.length === 0) {
      logger.warn('Nenhum cargo encontrado para sincronizar (além do @everyone).');
      return 0;
    }

    await sendRolesToDatabase(allRolesData);
    logger.info('✅ Sincronização de cargos finalizada com sucesso.');
    return allRolesData.length;
  } catch (error) {
    logger.error(`Erro ao sincronizar cargos: ${getErrorMessage(error)}`);
    return 0;
  }
}
