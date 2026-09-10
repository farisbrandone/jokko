import { afterEach, describe, expect, it, vi } from 'vitest';
import { MetaCloudWhatsAppSender } from './whatsapp-cloud.sender';

const cfg = { token: 'tok', phoneNumberId: '123', apiVersion: 'v21.0' };

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('MetaCloudWhatsAppSender', () => {
  it('POST vers la Graph API avec le bon corps et renvoie true si 2xx', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    const ok = await new MetaCloudWhatsAppSender(cfg).send('+221 77 000 00 00', 'Bonjour');

    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v21.0/123/messages');
    expect(init.headers.authorization).toBe('Bearer tok');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      messaging_product: 'whatsapp',
      to: '221770000000',
      type: 'text',
      text: { body: 'Bonjour' },
    });
  });

  it('renvoie false sans lever si la réponse est non-2xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, text: () => Promise.resolve('nope') }),
    );
    await expect(new MetaCloudWhatsAppSender(cfg).send('221770000000', 'x')).resolves.toBe(false);
  });

  it('renvoie false sans lever si fetch rejette', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('réseau coupé')));
    await expect(new MetaCloudWhatsAppSender(cfg).send('221770000000', 'x')).resolves.toBe(false);
  });
});
