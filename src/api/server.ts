import express, { type Express, type Request, type Response } from 'express';
import type { Client } from 'discord.js';
import logger from '@/utils/logger';
import { syncGuildMembers } from '@/functions/syncDataBase';
import { syncGuildRoles } from '@/functions/syncRoles';
import { getErrorMessage } from '@/utils/errors';

export function startServer(client: Client): Express {
  const app: Express = express();
  const PORT = Number(process.env.PORT) || 3001;

  app.use(express.json());

  app.get('/', (_req: Request, res: Response) => {
    res.send('OharaBot API ok!');
  });

  app.post('/sincronizar-dados', async (_req: Request, res: Response) => {
    logger.info('🔃 Sincronização agendada iniciada');
    try {
      const guild = client.guilds.cache.first();
      if (!guild) {
        return res.status(500).send('Nenhum servidor Discord encontrado em cache.');
      }
      const rolesProcessed = await syncGuildRoles(guild);
      const membersProcessed = await syncGuildMembers(guild);

      logger.debug(
        `✅ Dados sincronizados com sucesso! ${rolesProcessed} cargos e ${membersProcessed} membros foram processados.`
      );
      return res.status(200).send('Dados sincronizados com sucesso');
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error(`❌ Erro ao sincronizar dados automaticamente: ${errorMsg}`);
      return res.status(500).send('Erro ao sincronizar dados');
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Servidor web rodando na porta ${PORT} 🌐`);
  });

  return app;
}

export default startServer;
