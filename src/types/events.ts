import type { ClientEvents } from 'discord.js';

export interface Event<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K | string;
  once?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (...args: any[]) => Promise<void> | void;
}
