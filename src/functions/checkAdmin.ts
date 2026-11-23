import type { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { logger } from '@/utils/logger';

/**
 * Verifica se o usuário tem permissão de Admin/Dev e está no canal correto.
 * Já trata a resposta efêmera caso a verificação falhe.
 * @param interaction - A interação do comando slash recebida.
 * @returns Retorna true se permitido, false se negado.
 */
export async function checkAdmin(interaction: ChatInputCommandInteraction): Promise<boolean> {
  if (interaction.channelId !== process.env.BOT_LOG_CHANNEL_ID) {
    await interaction.reply({
      content: '❌ Este comando só pode ser usado no canal de logs/manutenção.',
      ephemeral: true,
    });
    return false;
  }

  const member = interaction.member as GuildMember | null;
  const devRoleId = process.env.DEV_ROLE_ID;

  const hasDevRole = Boolean(
    devRoleId && member?.roles && 'cache' in member.roles && member.roles.cache.has(devRoleId)
  );

  if (!hasDevRole) {
    logger.warn(`Usuário ${interaction.user.tag} tentou usar comando de admin sem permissão.`);
    await interaction.reply({
      content: '❌ Você não tem permissão de desenvolvedor para usar isso.',
      ephemeral: true,
    });
    return false;
  }

  return true;
}
