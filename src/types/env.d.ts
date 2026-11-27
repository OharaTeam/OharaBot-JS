declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: 'development' | 'production' | 'test';
      DISCORD_TOKEN: string;
      CLIENT_ID: string;
      OHARA_ID: string;
      KAIZOKU_ROLE_ID: string;
      DEV_ROLE_ID?: string;
      BOT_LOG_CHANNEL_ID?: string;
      BACK_END_URL?: string;
      BOT_KEY?: string;
      LOG_WEBHOOK_URL?: string;
      PORT?: string;
    }
  }
}

export {};
