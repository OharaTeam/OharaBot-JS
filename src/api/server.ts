import type { Server } from 'node:http';
import express, { type Express, type Request, type Response } from 'express';
import type { Client } from 'discord.js';
import logger from '@/utils/logger';
import { syncGuildMembers } from '@/functions/syncDataBase';
import { syncGuildRoles } from '@/functions/syncRoles';
import { getErrorMessage } from '@/utils/errors';
import { apiKeyAuth } from '@/middleware/auth';
import { getOharaGuild } from '@/utils/resolveGuild';

export interface OharaExpressApp extends Express {
  httpServer?: Server;
}

export function startServer(client: Client): OharaExpressApp {
  const app = express() as OharaExpressApp;
  const portEnv = process.env.PORT;
  const PORT = portEnv !== undefined && portEnv !== '' ? Number(portEnv) : 3001;

  app.use(express.json());

  // Endpoint de monitoramento público / irrestrito (D-03)
  app.get('/', (_req: Request, res: Response) => {
    res.send('OharaBot API ok!');
  });

  // Rota protegida com apiKeyAuth e resolução defensiva de guilda (D-01, D-05, D-06)
  app.post('/sincronizar-dados', apiKeyAuth, async (_req: Request, res: Response) => {
    logger.info('🔃 Sincronização agendada iniciada via API');
    try {
      let guild;
      try {
        guild = await getOharaGuild(client);
      } catch (guildError) {
        const errorMsg = getErrorMessage(guildError);
        logger.warn(`⚠️ Não foi possível conectar à guilda no Discord: ${errorMsg}`);
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'Não foi possível conectar à guilda no Discord',
        });
      }

      const rolesProcessed = await syncGuildRoles(guild);
      const membersProcessed = await syncGuildMembers(guild);

      logger.debug(
        `✅ Dados sincronizados com sucesso! ${rolesProcessed} cargos e ${membersProcessed} membros foram processados.`
      );
      return res.status(200).json({
        message: 'Dados sincronizados com sucesso',
        rolesProcessed,
        membersProcessed,
      });
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error(`❌ Erro ao sincronizar dados automaticamente: ${errorMsg}`);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Erro ao sincronizar dados',
      });
    }
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Servidor web rodando na porta ${PORT} 🌐`);
  });

  app.httpServer = server;

  return app;
}

export default startServer;
