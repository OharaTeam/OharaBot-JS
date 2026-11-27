import type { ChatInputCommandInteraction, CommandInteraction } from 'discord.js';

/**
 * Envia uma mensagem e a deleta automaticamente após um tempo especificado.
 * @param interaction - A interação do comando Discord.
 * @param content - O texto ou conteúdo da mensagem.
 * @param seconds - Tempo em segundos antes de deletar a mensagem.
 */
export async function replyTemporary(
  interaction: ChatInputCommandInteraction | CommandInteraction,
  content: string,
  seconds: number
): Promise<void> {
  await interaction.reply({ content, ephemeral: true });

  setTimeout(
    () => {
      interaction.deleteReply().catch(() => {});
    },
    Math.max(0, seconds) * 1000
  );
}
