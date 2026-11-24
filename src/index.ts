import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import logger from '@/utils/logger';
import { verifyEnvironment } from '@/utils/verifyEnvironment';
import { startServer } from '@/api/server';
import { getErrorMessage } from '@/utils/errors';
import type { Command, Event } from '@/types';

// Cria a instância do cliente
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

// Coleções tipadas para armazenar comandos e cooldowns na memória
client.commands = new Collection();
client.cooldowns = new Collection();

// --- HANDLER DE COMANDOS ---
const foldersPath = path.resolve(import.meta.dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  if (!fs.statSync(commandsPath).isDirectory()) continue;

  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const module = await import(filePath);
    const command: Command = module.default ?? module;

    if (command && 'data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      logger.warn(`O comando em ${filePath} está faltando a propriedade "data" ou "execute".`);
    }
  }
}

// --- HANDLER DE EVENTOS ---
const eventsPath = path.resolve(import.meta.dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const module = await import(filePath);
  const event: Event = module.default ?? module;

  if (event && event.name && typeof event.execute === 'function') {
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  } else {
    logger.warn(`O evento em ${filePath} está faltando a propriedade "name" ou "execute".`);
  }
}

process.on('unhandledRejection', (reason) => {
  const message = getErrorMessage(reason);
  const stack = reason instanceof Error ? `\n${reason.stack ?? ''}` : '';
  logger.error(`Unhandled Rejection: ${message}${stack}`);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${getErrorMessage(error)}\n${error.stack ?? ''}`);
  process.exit(1);
});

const { environment } = verifyEnvironment();

client
  .login(process.env.DISCORD_TOKEN)
  .then(() => {
    if (environment === 'development') {
      logger.warn(
        'Ambiente de desenvolvimento detectado. Certifique-se de que o backend local está rodando em http://localhost:3000'
      );
    } else {
      logger.warn('Ambiente de produção detectado. Certifique-se de que o backend está acessível no URL configurado.');
    }

    startServer(client);
  })
  .catch((err) => {
    logger.error(`Falha ao logar o bot: ${getErrorMessage(err)}`);
  });
