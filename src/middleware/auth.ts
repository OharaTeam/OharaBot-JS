import type { Request, Response, NextFunction } from 'express';
import logger from '@/utils/logger';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const configuredKey = process.env.BOT_KEY;

  // Fail-closed seguro se BOT_KEY não estiver configurada no servidor (D-04)
  if (!configuredKey || configuredKey.trim() === '') {
    logger.error('❌ Falha de segurança crítica: BOT_KEY não configurada no ambiente.');
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Servidor mal configurado: chave de autenticação ausente.',
    });
    return;
  }

  // Suporte a x-api-key e Authorization: Bearer (D-01)
  const headerKey = req.headers['x-api-key'];
  const authHeader = req.headers.authorization;
  const bearerKey =
    authHeader?.startsWith('Bearer ') || authHeader?.startsWith('bearer ') ? authHeader.slice(7).trim() : undefined;

  const providedKey = (typeof headerKey === 'string' ? headerKey : undefined) || bearerKey;

  if (!providedKey || providedKey !== configuredKey) {
    logger.warn(`⚠️ Tentativa de acesso não autorizado na rota ${req.method} ${req.path}`);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'API key inválida ou ausente.',
    });
    return;
  }

  next();
}
