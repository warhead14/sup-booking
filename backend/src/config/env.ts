import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  adminPassword: process.env.ADMIN_PASSWORD || 'admin',
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    relayUrl: process.env.TELEGRAM_RELAY_URL || 'https://functions.yandexcloud.net/d4envgm9e4kktq5tugqp'
  }

};
