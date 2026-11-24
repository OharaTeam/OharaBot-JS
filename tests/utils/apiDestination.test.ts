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

  describe('com target explícito', () => {
    it('deve retornar URL local com target="local" mesmo se NODE_ENV for production', () => {
      process.env.NODE_ENV = 'production';
      process.env.BACK_END_URL = 'https://api.ohara.com.br';
      const destination = getApiDestination('membros', 'local');
      expect(destination).toBe('http://localhost:3000/membros');
      expect(debugSpy).toHaveBeenCalled();
    });

    it('deve normalizar barra inicial com target="local"', () => {
      process.env.NODE_ENV = 'production';
      const destination = getApiDestination('/cargos', 'local');
      expect(destination).toBe('http://localhost:3000/cargos');
    });

    it('deve retornar URL de produção com target="producao" mesmo se NODE_ENV for development', () => {
      process.env.NODE_ENV = 'development';
      process.env.BACK_END_URL = 'https://api.ohara.com.br';
      const destination = getApiDestination('membros', 'producao');
      expect(destination).toBe('https://api.ohara.com.br/membros');
      expect(debugSpy).toHaveBeenCalled();
    });

    it('deve normalizar barra inicial e trailing slash de BACK_END_URL com target="producao"', () => {
      process.env.NODE_ENV = 'development';
      process.env.BACK_END_URL = 'https://api.ohara.com.br/';
      const destination = getApiDestination('/cargos', 'producao');
      expect(destination).toBe('https://api.ohara.com.br/cargos');
    });

    it('deve lançar erro explicativo se BACK_END_URL não estiver configurada com target="producao"', () => {
      delete process.env.BACK_END_URL;
      expect(() => getApiDestination('membros', 'producao')).toThrow(
        'Variável BACK_END_URL não configurada no ambiente para destino de produção.'
      );
    });

    it('deve lançar erro explicativo se BACK_END_URL for apenas espaços com target="producao"', () => {
      process.env.BACK_END_URL = '   ';
      expect(() => getApiDestination('membros', 'producao')).toThrow(
        'Variável BACK_END_URL não configurada no ambiente para destino de produção.'
      );
    });
  });

  it('deve lançar erro explicativo se BACK_END_URL não estiver configurada em ambiente de produção implícito', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.BACK_END_URL;
    expect(() => getApiDestination('membros')).toThrow(
      'Variável BACK_END_URL não configurada no ambiente para destino de produção.'
    );
  });
});
