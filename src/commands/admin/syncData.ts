import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { checkAdmin } from '@/functions/checkAdmin';
import { syncGuildMembers } from '@/functions/syncDataBase';
import { syncGuildRoles } from '@/functions/syncRoles';
import logger from '@/utils/logger';
import { getErrorMessage } from '@/utils/errors';
import type { Command } from '@/types/commands';

const isProduction = process.env.NODE_ENV === 'production';

const command: Command = {
  cooldown: 300,
  data: new SlashCommandBuilder()
    .setName(isProduction ? 'sincronizar-database' : 'sincronizar-localmente')
    .setDescription(
      isProduction
        ? 'Sincronizar os dados dos membros com o banco de dados (Somente Devs).'
        : 'Sincronizar os dados dos membros localmente (Somente Devs).'
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdmin(interaction))) return;

    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ Este comando só pode ser executado em um servidor Discord.',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: '🔄 Iniciando sincronização de membros... Acompanhe no console.',
      ephemeral: true,
    });

    try {
      const rolesProcessed = await syncGuildRoles(interaction.guild);
      if (rolesProcessed === 0 && (interaction.guild.roles.cache.size ?? 0) > 0) {
        await interaction.editReply(
          '⚠️ Atenção: Sincronização de cargos falhou ou retornou 0. A sincronização de membros foi abortada para evitar erros.'
        );
        return;
      }

      const totalProcessed = await syncGuildMembers(interaction.guild);

      if (totalProcessed > 0) {
        await interaction.editReply(
          `✅ Dados de **${totalProcessed}** membros processados, ${rolesProcessed} cargos processados.`
        );
      } else {
        await interaction.editReply('❌ Falha na sincronização. Verifique os logs.');
      }
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error(`Erro ao executar sincronização de dados: ${errorMsg}`);
      await interaction.editReply(`❌ Erro durante a sincronização: ${errorMsg}`);
    }
  },
};

export default command;
