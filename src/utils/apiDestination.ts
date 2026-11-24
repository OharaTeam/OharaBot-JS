import { logger } from '@/utils/logger';

export type SyncTarget = 'local' | 'producao';

export function getApiDestination(endpoint: string, target?: SyncTarget): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

  const isLocal = target ? target === 'local' : (process.env.NODE_ENV || 'development') === 'development';

  if (isLocal) {
    logger.debug(`Destino API [local] para endpoint: ${cleanEndpoint}`);
    return `http://localhost:3000/${cleanEndpoint}`;
  } else {
    logger.debug(`Destino API [produção] para endpoint: ${cleanEndpoint}`);
    const rawUrl = process.env.BACK_END_URL;
    if (!rawUrl || rawUrl.trim() === '') {
      throw new Error('Variável BACK_END_URL não configurada no ambiente para destino de produção.');
    }
    const baseUrl = rawUrl.trim().replace(/\/$/, '');
    return `${baseUrl}/${cleanEndpoint}`;
  }
}
