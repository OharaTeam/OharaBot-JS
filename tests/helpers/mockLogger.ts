import { mock, spyOn } from 'bun:test';

export interface MockLoggerTarget {
  info: (...args: unknown[]) => unknown;
  warn: (...args: unknown[]) => unknown;
  error: (...args: unknown[]) => unknown;
  debug: (...args: unknown[]) => unknown;
}

export function createMockLogger(loggerInstance?: MockLoggerTarget) {
  const target: MockLoggerTarget = loggerInstance ?? {
    info: mock(() => target),
    warn: mock(() => target),
    error: mock(() => target),
    debug: mock(() => target),
  };

  const infoSpy = spyOn(target, 'info').mockImplementation(() => target);
  const warnSpy = spyOn(target, 'warn').mockImplementation(() => target);
  const errorSpy = spyOn(target, 'error').mockImplementation(() => target);
  const debugSpy = spyOn(target, 'debug').mockImplementation(() => target);

  return {
    target,
    spies: {
      info: infoSpy,
      warn: warnSpy,
      error: errorSpy,
      debug: debugSpy,
    },
    restore() {
      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
      debugSpy.mockRestore();
    },
  };
}
