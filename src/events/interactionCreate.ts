import { Events, type Interaction, Collection } from 'discord.js';
import logger from '@/utils/logger';
import { replyTemporary } from '@/functions/replyUtils';
import { getErrorMessage } from '@/utils/errors';
import type { Event } from '@/types/events';

const event: Event = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      logger.error(`Nenhum comando correspondente a ${interaction.commandName} foi encontrado.`);
      return;
    }

    // Sistema de cooldown
    const { cooldowns } = interaction.client;
    if (command.cooldown) {
      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
      }

      const now = Date.now();
      const timestamp = cooldowns.get(command.data.name)!;
      const cooldownAmount = command.cooldown * 1000;

      if (timestamp.has(interaction.user.id)) {
        const expirationTime = timestamp.get(interaction.user.id)! + cooldownAmount;
        if (now < expirationTime) {
          const expiredTimestamp = Math.round(expirationTime / 1000);
          const timeLeftSeconds = (expirationTime - now) / 1000 + 1;
          await replyTemporary(
            interaction,
            `⏳ Opa! Você está rápido demais. Espere <t:${expiredTimestamp}:R> para usar \`${command.data.name}\` novamente.`,
            timeLeftSeconds
          );
          return;
        }
      }

      timestamp.set(interaction.user.id, now);
      setTimeout(() => timestamp.delete(interaction.user.id), cooldownAmount);
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error(`Erro ao executar comando ${interaction.commandName}: ${errorMsg}`);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'Houve um erro ao executar esse comando!', ephemeral: true });
      } else {
        await interaction.reply({ content: 'Houve um erro ao executar esse comando!', ephemeral: true });
      }
    }
  },
};

export default event;
