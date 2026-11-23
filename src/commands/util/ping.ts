import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '@/types/commands';

const command: Command = {
  cooldown: 3,
  data: new SlashCommandBuilder().setName('ping').setDescription('Responde com Pong e a latência!'),
  async execute(interaction: ChatInputCommandInteraction) {
    const apiLatency = Date.now() - interaction.createdTimestamp;
    const wsLatency = interaction.client.ws.ping;
    await interaction.reply(`🏓 Pong! Latência: ${apiLatency}ms (WebSocket: ${wsLatency}ms)`);
  },
};

export default command;
