import { config } from '../config/env';

export const sendTelegramNotification = async (message: string) => {
  if (!config.telegram.botToken || !config.telegram.chatId) {
    console.log('[Telegram Mock]', message);
    return;
  }

  try {
    const url = config.telegram.relayUrl || `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
    
    const body = config.telegram.relayUrl
      ? JSON.stringify({
          text: message,
          chatId: config.telegram.chatId,
          botToken: config.telegram.botToken
        })
      : JSON.stringify({
          chat_id: config.telegram.chatId,
          text: message,
          parse_mode: 'HTML'
        });

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body
    });
  } catch (err) {
    console.error('Failed to send telegram notification', err);
  }
};
