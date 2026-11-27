import logger from '@/utils/logger';

export function verifyEnvironment(): { environment: string; oharaId: string; kaizokuRoleId: string } {
  const environment = process.env.NODE_ENV || 'development';
  const oharaId = process.env.OHARA_ID;
  const kaizokuRoleId = process.env.KAIZOKU_ROLE_ID;

  if (!oharaId || oharaId.trim() === '') {
    logger.error('❌ Variável de ambiente obrigatória ausente: OHARA_ID não foi definido.');
    process.exit(1);
  }

  if (!kaizokuRoleId || kaizokuRoleId.trim() === '') {
    logger.error('❌ Variável de ambiente obrigatória ausente: KAIZOKU_ROLE_ID não foi definido.');
    process.exit(1);
  }

  logger.debug(`Ambiente atual: ${environment}, use os comandos com cuidado!`);
  return { environment, oharaId, kaizokuRoleId };
}

// Mantido para retrocompatibilidade
export function verifyLocalEnvironment(): string {
  return verifyEnvironment().environment;
}
