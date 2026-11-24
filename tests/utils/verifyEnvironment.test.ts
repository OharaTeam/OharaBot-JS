import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { verifyEnvironment, verifyLocalEnvironment } from '@/utils/verifyEnvironment';
import logger from '@/utils/logger';

describe('verifyEnvironment', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalOharaId = process.env.OHARA_ID;
  let debugSpy: ReturnType<typeof spyOn>;
  let errorSpy: ReturnType<typeof spyOn>;
  let exitSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    debugSpy = spyOn(logger, 'debug').mockImplementation(() => logger);
    errorSpy = spyOn(logger, 'error').mockImplementation(() => logger);
    exitSpy = spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`process.exit called with ${code}`);
    });
    process.env.OHARA_ID = 'mock-ohara-id';
  });

  afterEach(() => {
    debugSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();

    if (originalEnv !== undefined) {
      process.env.NODE_ENV = originalEnv;
    } else {
      delete process.env.NODE_ENV;
    }

    if (originalOharaId !== undefined) {
      process.env.OHARA_ID = originalOharaId;
    } else {
      delete (process.env as Record<string, string | undefined>).OHARA_ID;
    }
  });

  it('deve retornar "development" quando process.env.NODE_ENV for indefinido', () => {
    delete process.env.NODE_ENV;
    const env = verifyLocalEnvironment();
    expect(env).toBe('development');
    expect(debugSpy).toHaveBeenCalled();
  });

  it('deve retornar "development" quando process.env.NODE_ENV for "development"', () => {
    process.env.NODE_ENV = 'development';
    const env = verifyLocalEnvironment();
    expect(env).toBe('development');
    expect(debugSpy).toHaveBeenCalled();
  });

  it('deve retornar "production" quando process.env.NODE_ENV for "production"', () => {
    process.env.NODE_ENV = 'production';
    const env = verifyLocalEnvironment();
    expect(env).toBe('production');
    expect(debugSpy).toHaveBeenCalled();
  });

  it('deve retornar "test" quando process.env.NODE_ENV for "test"', () => {
    process.env.NODE_ENV = 'test';
    const env = verifyLocalEnvironment();
    expect(env).toBe('test');
    expect(debugSpy).toHaveBeenCalled();
  });

  it('deve retornar objeto com environment e oharaId quando OHARA_ID estiver definido', () => {
    process.env.NODE_ENV = 'production';
    process.env.OHARA_ID = 'ohara-valid-id';

    const result = verifyEnvironment();

    expect(result).toEqual({
      environment: 'production',
      oharaId: 'ohara-valid-id',
    });
    expect(debugSpy).toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('deve encerrar o processo com código 1 e logar erro quando OHARA_ID for indefinido', () => {
    delete (process.env as Record<string, string | undefined>).OHARA_ID;

    expect(() => verifyEnvironment()).toThrow('process.exit called with 1');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('deve encerrar o processo com código 1 e logar erro quando OHARA_ID for string vazia ou em branco', () => {
    process.env.OHARA_ID = '   ';

    expect(() => verifyEnvironment()).toThrow('process.exit called with 1');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalled();
  });
});
