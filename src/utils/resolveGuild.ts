import type { Client, Guild } from 'discord.js';
import logger from '@/utils/logger';
import { getErrorMessage } from '@/utils/errors';

/**
 * Obtém a guilda principal do Ohara de forma defensiva via REST fetch direto.
 * Evita falhas por cache frio ou guildas parciais.
 */
export async function getOharaGuild(client: Client): Promise<Guild> {
  const guildId = process.env.OHARA_ID;
  if (!guildId || guildId.trim() === '') {
    logger.error('❌ OHARA_ID não está definido nas variáveis de ambiente.');
    throw new Error('OHARA_ID não definido nas variáveis de ambiente.');
  }

  try {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      throw new Error(`Guilda com ID ${guildId} não encontrada no Discord.`);
    }
    return guild;
  } catch (error) {
    const message = getErrorMessage(error);
    logger.error(`❌ Erro ao resolver guilda Ohara (${guildId}): ${message}`);
    throw error;
  }
}
