import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { getApiDestination } from '@/utils/apiDestination';
import logger from '@/utils/logger';

describe('apiDestination', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalBackendUrl = process.env.BACK_END_URL;
  let debugSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    debugSpy = spyOn(logger, 'debug').mockImplementation(() => logger);
  });

  afterEach(() => {
    debugSpy.mockRestore();
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
    if (originalBackendUrl !== undefined) {
      process.env.BACK_END_URL = originalBackendUrl;
    } else {
      delete process.env.BACK_END_URL;
    }
  });

  it('deve retornar a URL do localhost em ambiente de desenvolvimento', () => {
    process.env.NODE_ENV = 'development';
    const destination = getApiDestination('users/sync');
    expect(destination).toBe('http://localhost:3000/users/sync');
    expect(debugSpy).toHaveBeenCalled();
  });

  it('deve evitar barras duplicadas ao receber endpoint com barra no início em desenvolvimento', () => {
    process.env.NODE_ENV = 'development';
    const destination = getApiDestination('/users/sync');
    expect(destination).toBe('http://localhost:3000/users/sync');
  });

  it('deve retornar a URL do BACK_END_URL em ambiente de produção', () => {
    process.env.NODE_ENV = 'production';
    process.env.BACK_END_URL = 'https://api.ohara.com.br';
    const destination = getApiDestination('users/sync');
    expect(destination).toBe('https://api.ohara.com.br/users/sync');
    expect(debugSpy).toHaveBeenCalled();
  });

  it('deve evitar barras duplicadas ao receber endpoint com barra no início em produção', () => {
    process.env.NODE_ENV = 'production';
    process.env.BACK_END_URL = 'https://api.ohara.com.br/';
    const destination = getApiDestination('/users/sync');
    expect(destination).toBe('https://api.ohara.com.br/users/sync');
  });
});
