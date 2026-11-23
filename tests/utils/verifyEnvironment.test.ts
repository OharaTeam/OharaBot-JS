import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { verifyLocalEnvironment } from '@/utils/verifyEnvironment';
import logger from '@/utils/logger';

describe('verifyEnvironment', () => {
  const originalEnv = process.env.NODE_ENV;
  let debugSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    debugSpy = spyOn(logger, 'debug').mockImplementation(() => logger);
  });

  afterEach(() => {
    debugSpy.mockRestore();
    if (originalEnv !== undefined) {
      process.env.NODE_ENV = originalEnv;
    } else {
      delete process.env.NODE_ENV;
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
});
