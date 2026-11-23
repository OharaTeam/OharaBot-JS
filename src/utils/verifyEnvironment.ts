import { logger } from '@/utils/logger';

export function verifyLocalEnvironment(): string {
  const environment = process.env.NODE_ENV || 'development';
  logger.debug(`Ambiente atual: ${environment}, use os comandos com cuidado!`);
  return environment;
}
