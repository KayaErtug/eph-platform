import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

@Injectable()
export class NetgsmService {
  private getConfig() {
    const apiUrl = String(process.env.NETGSM_OTP_API_URL || '').trim();
    const userCode = String(process.env.NETGSM_USERCODE || '').trim();
    const password = String(process.env.NETGSM_PASSWORD || '').trim();
    const header = String(process.env.NETGSM_HEADER || '').trim();

    if (!apiUrl || !userCode || !password || !header) {
      throw new ServiceUnavailableException(
        'NetGSM OTP ayarları tamamlanmamış.',
      );
    }

    return { apiUrl, userCode, password, header };
  }

  async sendOtp(phone: string, code: string) {
    const config = this.getConfig();
    const message =
      `EPH doğrulama kodunuz: ${code}. ` +
      'Bu kodu kimseyle paylaşmayınız.';

    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usercode: config.userCode,
        password: config.password,
        header: config.header,
        phone,
        message,
      }),
    });

    const rawResponse = await response.text();

    if (!response.ok) {
      throw new BadGatewayException(
        `NetGSM OTP gönderimi başarısız: ${rawResponse}`,
      );
    }

    return { success: true, rawResponse };
  }
}
