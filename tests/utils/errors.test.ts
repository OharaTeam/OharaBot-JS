import { describe, it, expect } from 'bun:test';
import { getErrorMessage, toError } from '@/utils/errors';

describe('errors utility', () => {
  describe('getErrorMessage', () => {
    it('deve extrair a mensagem de uma instância de Error', () => {
      const error = new Error('falha fatal');
      expect(getErrorMessage(error)).toBe('falha fatal');
    });

    it('deve retornar a própria string quando receber uma string pura', () => {
      expect(getErrorMessage('string pura de erro')).toBe('string pura de erro');
    });

    it('deve extrair a propriedade message de um objeto', () => {
      const objError = { message: 'mensagem em objeto' };
      expect(getErrorMessage(objError)).toBe('mensagem em objeto');
    });

    it('deve converter número para string', () => {
      expect(getErrorMessage(404)).toBe('404');
    });

    it('deve retornar valores descritivos seguros para null e undefined sem lançar exceção', () => {
      expect(getErrorMessage(null)).toBe('null');
      expect(getErrorMessage(undefined)).toBe('undefined');
    });
  });

  describe('toError', () => {
    it('deve retornar a própria instância recebida quando já for Error', () => {
      const error = new Error('erro original');
      const result = toError(error);
      expect(result).toBe(error);
      expect(result.message).toBe('erro original');
    });

    it('deve criar e retornar uma nova instância de Error quando receber string', () => {
      const result = toError('falha em string');
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('falha em string');
    });

    it('deve converter outros tipos desconhecidos em instâncias de Error com mensagem correta', () => {
      const result = toError({ message: 'erro encapsulado' });
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('erro encapsulado');
    });
  });
});
