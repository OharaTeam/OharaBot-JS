import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import type { Request, Response, NextFunction } from 'express';
import { apiKeyAuth } from '@/middleware/auth';
import logger from '@/utils/logger';
import { createMockLogger } from '../helpers/mockLogger';

describe('apiKeyAuth middleware', () => {
  let mockLoggerHelper: ReturnType<typeof createMockLogger>;
  const originalBotKey = process.env.BOT_KEY;

  beforeEach(() => {
    mockLoggerHelper = createMockLogger(logger);
    process.env.BOT_KEY = 'secret-test-key';
  });

  afterEach(() => {
    mockLoggerHelper.restore();
    if (originalBotKey !== undefined) {
      process.env.BOT_KEY = originalBotKey;
    } else {
      delete process.env.BOT_KEY;
    }
  });

  it('deve chamar next() quando x-api-key for válida', () => {
    const req = {
      headers: { 'x-api-key': 'secret-test-key' },
      path: '/sincronizar-dados',
      method: 'POST',
    } as unknown as Request;
    const res = { status: mock(() => res), json: mock(() => res) } as unknown as Response;
    const next = mock(() => {}) as unknown as NextFunction;

    apiKeyAuth(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('deve chamar next() quando Authorization: Bearer <key> for válida', () => {
    const req = {
      headers: { authorization: 'Bearer secret-test-key' },
      path: '/sincronizar-dados',
      method: 'POST',
    } as unknown as Request;
    const res = { status: mock(() => res), json: mock(() => res) } as unknown as Response;
    const next = mock(() => {}) as unknown as NextFunction;

    apiKeyAuth(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('deve retornar 401 quando chave não for fornecida', () => {
    const req = {
      headers: {},
      path: '/sincronizar-dados',
      method: 'POST',
    } as unknown as Request;
    let statusCode: number | undefined;
    let jsonBody: unknown;
    const res = {
      status: mock((code: number) => {
        statusCode = code;
        return res;
      }),
      json: mock((body: unknown) => {
        jsonBody = body;
        return res;
      }),
    } as unknown as Response;
    const next = mock(() => {}) as unknown as NextFunction;

    apiKeyAuth(req, res, next);

    expect(statusCode).toBe(401);
    expect(jsonBody).toEqual({ error: 'Unauthorized', message: 'API key inválida ou ausente.' });
    expect(next).not.toHaveBeenCalled();
    expect(mockLoggerHelper.spies.warn).toHaveBeenCalled();
  });

  it('deve retornar 401 quando chave for incorreta', () => {
    const req = {
      headers: { 'x-api-key': 'chave-incorreta' },
      path: '/sincronizar-dados',
      method: 'POST',
    } as unknown as Request;
    let statusCode: number | undefined;
    let jsonBody: unknown;
    const res = {
      status: mock((code: number) => {
        statusCode = code;
        return res;
      }),
      json: mock((body: unknown) => {
        jsonBody = body;
        return res;
      }),
    } as unknown as Response;
    const next = mock(() => {}) as unknown as NextFunction;

    apiKeyAuth(req, res, next);

    expect(statusCode).toBe(401);
    expect(jsonBody).toEqual({ error: 'Unauthorized', message: 'API key inválida ou ausente.' });
    expect(next).not.toHaveBeenCalled();
    expect(mockLoggerHelper.spies.warn).toHaveBeenCalled();
  });

  it('deve retornar 500 fail-closed quando process.env.BOT_KEY for indefinida', () => {
    delete process.env.BOT_KEY;
    const req = {
      headers: { 'x-api-key': 'qualquer-coisa' },
      path: '/sincronizar-dados',
      method: 'POST',
    } as unknown as Request;
    let statusCode: number | undefined;
    let jsonBody: unknown;
    const res = {
      status: mock((code: number) => {
        statusCode = code;
        return res;
      }),
      json: mock((body: unknown) => {
        jsonBody = body;
        return res;
      }),
    } as unknown as Response;
    const next = mock(() => {}) as unknown as NextFunction;

    apiKeyAuth(req, res, next);

    expect(statusCode).toBe(500);
    expect(jsonBody).toEqual({
      error: 'Internal Server Error',
      message: 'Servidor mal configurado: chave de autenticação ausente.',
    });
    expect(next).not.toHaveBeenCalled();
    expect(mockLoggerHelper.spies.error).toHaveBeenCalled();
  });

  it('deve retornar 500 fail-closed quando process.env.BOT_KEY for string vazia', () => {
    process.env.BOT_KEY = '';
    const req = {
      headers: { 'x-api-key': 'qualquer-coisa' },
      path: '/sincronizar-dados',
      method: 'POST',
    } as unknown as Request;
    let statusCode: number | undefined;
    const res = {
      status: mock((code: number) => {
        statusCode = code;
        return res;
      }),
      json: mock(() => res),
    } as unknown as Response;
    const next = mock(() => {}) as unknown as NextFunction;

    apiKeyAuth(req, res, next);

    expect(statusCode).toBe(500);
    expect(next).not.toHaveBeenCalled();
    expect(mockLoggerHelper.spies.error).toHaveBeenCalled();
  });
});
