// import fetch from 'node-fetch';

export class PaymentService {
  private static get baseUrl() {
    return process.env.ALFABANK_API_URL || 'https://pay.alfabank.ru/payment/rest/';
  }

  private static get credentials() {
    return {
      userName: process.env.ALFABANK_USERNAME || 'test_username',
      password: process.env.ALFABANK_PASSWORD || 'test_password',
    };
  }

  /**
   * Initializes a payment session in Alfa-Bank.
   * @param orderNumber Unique order number (e.g. booking id)
   * @param amount Amount in KOPECKS (1 ruble = 100 kopecks)
   * @param returnUrl URL to redirect user after payment
   * @param description Order description
   * @returns Object with orderId and formUrl
   */
  static async initPayment(orderNumber: string, amount: number, returnUrl: string, description: string): Promise<{ orderId: string, formUrl: string }> {
    const url = new URL('register.do', this.baseUrl);
    const params = new URLSearchParams({
      userName: this.credentials.userName,
      password: this.credentials.password,
      orderNumber,
      amount: amount.toString(),
      returnUrl,
      description,
      pageView: 'MOBILE'
    });

    console.log(`[PaymentService] Initiating payment for order ${orderNumber}, amount: ${amount}`);

    const res = await fetch(`${url}?${params.toString()}`, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Alfa-Bank API error: ${res.statusText}`);
    }

    const data = await res.json() as any;

    if (data.errorCode) {
      throw new Error(`Alfa-Bank error ${data.errorCode}: ${data.errorMessage}`);
    }

    return {
      orderId: data.orderId,
      formUrl: data.formUrl
    };
  }

  /**
   * Checks the status of a payment.
   * @param orderId The orderId returned by initPayment
   * @returns The status of the order (0 - registered, 1 - pre-authorized, 2 - authorized, 3 - canceled, 4 - refunded, 5 - internal auth by ACS, 6 - rejected)
   */
  static async getOrderStatus(orderId: string): Promise<number> {
    const url = new URL('getOrderStatusExtended.do', this.baseUrl);
    const params = new URLSearchParams({
      userName: this.credentials.userName,
      password: this.credentials.password,
      orderId
    });

    const res = await fetch(`${url}?${params.toString()}`, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Alfa-Bank API error: ${res.statusText}`);
    }

    const data = await res.json() as any;
    
    if (data.errorCode && data.errorCode !== '0') {
      throw new Error(`Alfa-Bank error ${data.errorCode}: ${data.errorMessage}`);
    }

    return parseInt(data.actionCode || data.orderStatus, 10);
  }
}
