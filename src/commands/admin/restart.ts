import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import logger from '@/utils/logger';
import { checkAdmin } from '@/functions/checkAdmin';
import type { Command } from '@/types/commands';

const command: Command = {
  cooldown: 30,
  data: new SlashCommandBuilder().setName('restart').setDescription('Reinicia o processo do bot (Apenas Devs).'),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdmin(interaction))) return;

    await interaction.reply('🔄 Reiniciando o sistema... Até logo!');
    logger.debug(`Solicitação de reinicialização enviada por ${interaction.user.tag}. Encerrando processo...`);

    setTimeout(() => {
      process.exit(0);
    }, 1000);
  },
};

export default command;
