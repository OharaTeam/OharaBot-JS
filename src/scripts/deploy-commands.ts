import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { REST, Routes } from 'discord.js';
import type { Command } from '@/types/commands';

const commands: unknown[] = [];
const foldersPath = path.resolve(import.meta.dirname, '../commands');
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
      commands.push(command.data.toJSON());
    } else {
      console.warn(`[AVISO] O comando em ${filePath} está faltando a propriedade "data" ou "execute".`);
    }
  }
}

if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID || !process.env.OHARA_ID) {
  console.error('Variáveis DISCORD_TOKEN, CLIENT_ID ou OHARA_ID ausentes no ambiente.');
  process.exit(1);
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

try {
  console.log(`Começando a atualizar ${commands.length} comandos de aplicativo (/).`);

  const data = (await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.OHARA_ID), {
    body: commands,
  })) as unknown[];

  console.log(`Sucesso ao recarregar ${data.length} comandos de aplicativo (/).`);
} catch (error) {
  console.error(error);
  process.exit(1);
}
