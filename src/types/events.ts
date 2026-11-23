import type { ClientEvents } from 'discord.js';

export interface Event<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K | string;
  once?: boolean;
  execute: (...args: any[]) => Promise<void> | void;
}
