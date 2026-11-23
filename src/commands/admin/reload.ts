import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import logger from '@/utils/logger';
import { checkAdmin } from '@/functions/checkAdmin';
import { getErrorMessage } from '@/utils/errors';
import type { Command } from '@/types/commands';

const command: Command = {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription('Recarrega um comando específico (Apenas Devs).')
    .addStringOption((option) =>
      option.setName('comando').setDescription('O nome do comando para recarregar.').setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdmin(interaction))) return;

    const commandName = interaction.options.getString('comando', true).toLowerCase();
    const targetCommand = interaction.client.commands.get(commandName);

    if (!targetCommand) {
      await interaction.reply({
        content: `❌ Não encontrei nenhum comando com o nome \`${commandName}\`.`,
        ephemeral: true,
      });
      return;
    }

    let commandPath: string | null = null;
    const foldersPath = path.resolve(import.meta.dirname, '..');
    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
      const fullFolder = path.join(foldersPath, folder);
      if (!fs.statSync(fullFolder).isDirectory()) continue;

      const tsPath = path.join(fullFolder, `${targetCommand.data.name}.ts`);
      const jsPath = path.join(fullFolder, `${targetCommand.data.name}.js`);
      if (fs.existsSync(tsPath)) {
        commandPath = tsPath;
        break;
      } else if (fs.existsSync(jsPath)) {
        commandPath = jsPath;
        break;
      }
    }

    if (!commandPath) {
      await interaction.reply({
        content: '❌ Erro ao localizar o arquivo físico do comando.',
        ephemeral: true,
      });
      return;
    }

    try {
      const cacheBusterUrl = `${pathToFileURL(commandPath).href}?t=${Date.now()}`;
      const newModule = await import(cacheBusterUrl);
      const newCommand: Command = newModule.default ?? newModule;

      if (!newCommand?.data?.name || !newCommand.execute) {
        throw new Error('Comando importado não contém propriedades "data" ou "execute" válidas.');
      }

      interaction.client.commands.set(newCommand.data.name, newCommand);

      logger.debug(`Comando /${newCommand.data.name} recarregado por ${interaction.user.tag}`);
      await interaction.reply(`✅ Comando \`/${newCommand.data.name}\` foi recarregado com sucesso!`);
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error(`Erro ao recarregar comando ${commandName}: ${errorMsg}`);
      await interaction.reply({
        content: `❌ Houve um erro ao recarregar o comando: \n\`${errorMsg}\``,
        ephemeral: true,
      });
    }
  },
};

export default command;
