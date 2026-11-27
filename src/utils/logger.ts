import winston from 'winston';
import Transport from 'winston-transport';
import axios from 'axios';
import 'dotenv/config';

// Definimos cores para o console local
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(colors);

// --- Custom Transport para Discord Webhook ---
export class DiscordWebhookTransport extends Transport {
  private webhookUrl: string | undefined;

  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts);
    this.webhookUrl = process.env.LOG_WEBHOOK_URL;
  }

  override log(info: winston.Logform.TransformableInfo, callback: () => void): void {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Se não tiver URL, apenas ignora
    if (!this.webhookUrl) {
      return callback();
    }

    // Formata a mensagem para o Discord (Embed ou Texto Simples)
    let embedColor = 0x00ff00; // Verde (Info)
    if (typeof info.level === 'string') {
      if (info.level.includes('error')) embedColor = 0xff0000;
      if (info.level.includes('warn')) embedColor = 0xffff00;
    }

    // Removemos os caracteres de cor ANSI do log antes de mandar pro Discord
    const cleanMessage = String(info.message).replace(
      // eslint-disable-next-line no-control-regex
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      ''
    );

    const payload = {
      embeds: [
        {
          title: `[LOG: ${String(info.level).toUpperCase()}]`,
          description: `\`\`\`js\n${cleanMessage}\n\`\`\``,
          color: embedColor,
          timestamp: new Date().toISOString(),
          footer: {
            text: 'Sistema de Auditoria',
          },
        },
      ],
    };

    // Envia para o Webhook
    axios
      .post(this.webhookUrl, payload)
      .then(() => callback())
      .catch((err: unknown) => {
        console.error('Falha ao enviar log para o Discord:', err instanceof Error ? err.message : String(err));
        callback();
      });
  }
}

// --- Configuração Principal do Winston ---
const logger = winston.createLogger({
  level: 'debug', // Nível mínimo para logar
  format: winston.format.combine(
    winston.format.timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
    winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    // 1. Log no Console (Colorido)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
      ),
    }),
    // 2. Log no Discord (Via Webhook)
    new DiscordWebhookTransport({
      level: 'info',
    }),
  ],
});

export { logger };
export default logger;
