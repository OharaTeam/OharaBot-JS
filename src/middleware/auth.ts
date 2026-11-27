import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import logger from '@/utils/logger';

function timingSafeCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const rawConfiguredKey = process.env.BOT_KEY;

  // Fail-closed seguro se BOT_KEY não estiver configurada no servidor (D-04)
  if (!rawConfiguredKey || rawConfiguredKey.trim() === '') {
    logger.error('❌ Falha de segurança crítica: BOT_KEY não configurada no ambiente.');
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Servidor mal configurado: chave de autenticação ausente.',
    });
    return;
  }

  const configuredKey = rawConfiguredKey.trim();

  // Suporte a x-api-key e Authorization: Bearer (D-01) com sanitização de whitespace
  const rawHeader = req.headers['x-api-key'];
  const headerKey = typeof rawHeader === 'string' && rawHeader.trim() !== '' ? rawHeader.trim() : undefined;
  const authHeader = req.headers.authorization;
  const bearerMatch = authHeader?.match(/^bearer\s+(\S.*)$/i);
  const bearerKey = bearerMatch && bearerMatch[1].trim() !== '' ? bearerMatch[1].trim() : undefined;

  const providedKey = headerKey || bearerKey;

  if (!providedKey || !timingSafeCompare(providedKey, configuredKey)) {
    logger.warn(`⚠️ Tentativa de acesso não autorizado na rota ${req.method} ${req.path}`);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'API key inválida ou ausente.',
    });
    return;
  }

  next();
}
