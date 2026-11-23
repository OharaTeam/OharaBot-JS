/**
 * Test environment initialization fixture for bun:test.
 * Configures process.env and mocks remote transports.
 */

process.env.NODE_ENV = 'test';
process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'mock-discord-token';
process.env.CLIENT_ID = process.env.CLIENT_ID || 'mock-client-id';
process.env.OHARA_ID = process.env.OHARA_ID || 'mock-ohara-id';
process.env.LOG_WEBHOOK_URL = ''; // Garantir que nenhum webhook real seja chamado em testes

export function setupTestEnvironment(): { restoreEnv: () => void } {
  const originalEnv = { ...process.env };

  return {
    restoreEnv: () => {
      process.env = { ...originalEnv };
    },
  };
}
