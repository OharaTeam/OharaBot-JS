import { Events, type Client } from 'discord.js';
import logger from '@/utils/logger';
import type { Event } from '@/types/events';

const event: Event = {
  name: Events.ClientReady,
  once: true,
  execute(client: Client<true>) {
    logger.debug(`Pronto! Logado como ${client.user.tag}`);
  },
};

export default event;
