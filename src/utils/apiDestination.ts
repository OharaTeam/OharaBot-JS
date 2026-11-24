import { verifyLocalEnvironment } from '@/utils/verifyEnvironment';
import { logger } from '@/utils/logger';

export type SyncTarget = 'local' | 'producao';

export function getApiDestination(endpoint: string, target?: SyncTarget): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

  const isLocal = target ? target === 'local' : verifyLocalEnvironment() === 'development';

  if (isLocal) {
    logger.debug(`Destino API [local] para endpoint: ${cleanEndpoint}`);
    return `http://localhost:3000/${cleanEndpoint}`;
  } else {
    logger.debug(`Destino API [produção] para endpoint: ${cleanEndpoint}`);
    const baseUrl = (process.env.BACK_END_URL ?? '').replace(/\/$/, '');
    return `${baseUrl}/${cleanEndpoint}`;
  }
}
