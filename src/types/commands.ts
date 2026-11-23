import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

export type SupportedSlashCommandBuilder =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder;

export interface Command {
  cooldown?: number;
  data: SupportedSlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void> | void;
}

export interface CommandExecuteOptions {
  interaction: ChatInputCommandInteraction;
}
