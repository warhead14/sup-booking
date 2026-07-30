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

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Omit tokens from error message just in case
      throw new Error(`Telegram API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }
  } catch (err: any) {
    // Avoid logging the token if it's in the error message
    const safeError = err.message ? err.message.replace(config.telegram.botToken, '***') : 'Unknown error';
    console.error('[TelegramService] Failed to send notification:', safeError);
    throw err;
  }
};
