import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { checkAdmin } from '@/functions/checkAdmin';
import { syncGuildMembers } from '@/functions/syncDataBase';
import { syncGuildRoles } from '@/functions/syncRoles';
import { getOharaGuild } from '@/utils/resolveGuild';
import logger from '@/utils/logger';
import { getErrorMessage } from '@/utils/errors';
import type { Command } from '@/types/commands';

const command: Command = {
  cooldown: 300,
  data: new SlashCommandBuilder()
    .setName('sincronizar-dados')
    .setDescription('Sincroniza cargos e membros com o banco de dados (Apenas Devs).')
    .addSubcommand((subcommand) =>
      subcommand.setName('local').setDescription('Sincroniza dados com o backend local (http://localhost:3000).')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('producao').setDescription('Sincroniza dados com o backend de produção (BACK_END_URL).')
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdmin(interaction))) return;

    // Feedback inicial efêmero (D-11)
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getSubcommand() as 'local' | 'producao';
    const targetLabel = target === 'local' ? 'Local (localhost:3000)' : 'Produção';

    try {
      const guild = interaction.guild || (await getOharaGuild(interaction.client));

      await interaction.editReply(`🔄 Iniciando sincronização [${targetLabel}]... Acompanhe no console.`);

      const rolesProcessed = await syncGuildRoles(guild, target);
      if (rolesProcessed === 0 && (guild.roles?.cache?.size ?? 0) > 0) {
        await interaction.editReply(
          '⚠️ Atenção: Sincronização de cargos falhou ou retornou 0. A sincronização de membros foi abortada para evitar erros.'
        );
        return;
      }

      const totalProcessed = await syncGuildMembers(guild, 15, target);

      if (totalProcessed > 0) {
        await interaction.editReply(
          `✅ [${targetLabel}] Dados de **${totalProcessed}** membros e **${rolesProcessed}** cargos processados com sucesso.`
        );
      } else {
        await interaction.editReply(`❌ [${targetLabel}] Falha na sincronização. Verifique os logs.`);
      }
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error(`Erro ao executar sincronização de dados (${target}): ${errorMsg}`);
      await interaction.editReply(`❌ Erro durante a sincronização: ${errorMsg}`);
    }
  },
};

export default command;
