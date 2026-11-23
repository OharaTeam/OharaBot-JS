import { verifyLocalEnvironment } from '@/utils/verifyEnvironment';
import { logger } from '@/utils/logger';

export function getApiDestination(endpoint: string): string {
  const environment = verifyLocalEnvironment();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

  if (environment === 'development') {
    logger.debug(`Ambiente de desenvolvimento detectado. Usando URL local para endpoint: ${cleanEndpoint}`);
    return `http://localhost:3000/${cleanEndpoint}`;
  } else {
    logger.debug(`Ambiente de produção detectado. Usando URL de produção para endpoint: ${cleanEndpoint}`);
    const baseUrl = (process.env.BACK_END_URL ?? '').replace(/\/$/, '');
    return `${baseUrl}/${cleanEndpoint}`;
  }
}
