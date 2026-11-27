import type { Collection } from 'discord.js';
import type { Command } from './commands';

declare module 'discord.js' {
  export interface Client {
    commands: Collection<string, Command>;
    cooldowns: Collection<string, Collection<string, number>>;
  }
}
