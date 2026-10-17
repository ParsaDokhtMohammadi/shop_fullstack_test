import { config } from 'dotenv';

config();

// Express's "trust proxy" setting, which decides what `req.ip` is — and so
// what every rate limit counts per, since the throttler buckets by it.
//
// Behind nginx or Cloudflare the socket address is the proxy's, identical for
// every visitor, so leaving this off turns each per-ip limit into a shop-wide
// one: two OTP requests from anybody would use up the allowance for everyone.
//
// The value is how many proxies sit in front of this app, because that is how
// many X-Forwarded-For entries can be believed. Guessing high is worse than
// leaving it off — the extra hops are read from a header the client writes, so
// an attacker could present a fresh ip per request and never be limited at
// all. Hence the default of false: too strict beats bypassable, and this is
// not a value to default into.
const parseTrustProxy = (
  raw: string | undefined,
): boolean | number | string => {
  const value = (raw ?? '').trim();
  if (!value) return false;
  if (value === 'true') return true;
  if (value === 'false') return false;

  // A plain count is the common case: 1 behind one reverse proxy, 2 for
  // Cloudflare in front of nginx.
  if (/^\d+$/.test(value)) return Number(value);

  // Anything else goes to Express as-is — it also takes a comma-separated list
  // of proxy ips/subnets and the presets 'loopback', 'linklocal', 'uniquelocal'.
  return value;
};

export const env = {
  port: Number(process.env.PORT) || 3000,
  isProduction: process.env.NODE_ENV === 'production',

  // Only used to name the shop on the very first boot, before an admin has
  // saved anything in the settings table. Everything else shop-specific lives
  // in that table, not here.
  shopName: process.env.SHOP_NAME || 'فروشگاه',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'shop',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',

    // Managed Postgres (Liara, Arvan, DigitalOcean, Neon) refuses plaintext
    // connections, so this is on in most real deployments. Off by default
    // because the only place the app runs without it is a local postgres,
    // and a default of true would break `pnpm start:dev` on a fresh clone.
    ssl: process.env.DB_SSL === 'true',

    // Only read when ssl is on. Managed providers often present a self-signed
    // or private-CA certificate that node cannot check against its built-in
    // roots, and the connection then dies with SELF_SIGNED_CERT_IN_CHAIN.
    // Turning this off keeps the traffic encrypted but stops verifying who is
    // on the other end of it — so it defaults to on, and is a last resort
    // rather than the first thing to try when a connection fails.
    sslRejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
  },

  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Phone numbers that should own the admin panel, comma-separated. Read by
  // the PromoteAdmins migration and nothing else — no request path consults
  // it, so adding a number here does not make anybody an admin until the
  // migration runs.
  //
  // In env rather than in a table because it is the bootstrap problem: there
  // is no way to grant the first admin through the API, since every route that
  // could do it is behind AdminGuard. Any spelling normalizePhone accepts
  // works, so 09123456789 and +989123456789 are the same entry.
  adminPhoneNumbers: (process.env.ADMIN_PHONE_NUMBERS || '')
    .split(',')
    .map((phone) => phone.trim())
    .filter(Boolean),

  upload: {
    // Folder on disk, relative to the project root, and the URL prefix it is
    // served under. Keeping them separate means a client can move the folder
    // (e.g. onto a mounted volume) without changing any stored image URL.
    dir: process.env.UPLOAD_DIR || 'uploads',
    publicPath: process.env.UPLOAD_PUBLIC_PATH || '/uploads',
    maxSizeBytes: (Number(process.env.UPLOAD_MAX_SIZE_MB) || 5) * 1024 * 1024,
  },

  sms: {
    // 'mock' logs the message; 'kavenegar' actually sends it. Deliberately an
    // env var and not the settings row: the provider and the API key have to
    // agree, the key must never sit in a table any admin can read, and the
    // choice is wired into the DI container at boot.
    provider: (process.env.SMS_PROVIDER || 'mock').trim().toLowerCase(),
    kavenegarApiKey: process.env.SMS_KAVENEGAR_API_KEY || '',
    // The approved sender line, issued per account by Kavenegar.
    kavenegarSender: process.env.SMS_KAVENEGAR_SENDER || '',
  },

  payment: {
    // 'mock' or 'zarinpal'. Same reasoning as SMS_PROVIDER: it has to agree
    // with a merchant id, so it belongs in env, not in the settings table.
    provider: (process.env.PAYMENT_PROVIDER || 'mock').trim().toLowerCase(),

    // Where the gateway sends the customer's browser back to. Must be a url
    // this API serves, and for Zarinpal its domain must be the one registered
    // with them.
    callbackUrl:
      process.env.PAYMENT_CALLBACK_URL ||
      'http://localhost:3000/api/payments/callback',

    // Where the customer ends up afterwards — a page in the storefront, not in
    // this API. The callback redirects here with the result in the query, so
    // the customer sees a shop page rather than raw JSON.
    resultUrl:
      process.env.PAYMENT_RESULT_URL || 'http://localhost:5173/payment/result',

    // Filled in just below, from callbackUrl.
    callbackOrigin: '',

    zarinpal: {
      merchantId: process.env.ZARINPAL_MERCHANT_ID || '',
      requestUrl:
        process.env.ZARINPAL_REQUEST_URL ||
        'https://payment.zarinpal.com/pg/v4/payment/request.json',
      verifyUrl:
        process.env.ZARINPAL_VERIFY_URL ||
        'https://payment.zarinpal.com/pg/v4/payment/verify.json',
      startPayUrl:
        process.env.ZARINPAL_STARTPAY_URL ||
        'https://payment.zarinpal.com/pg/StartPay/{}',
      // Not configurable, and that is the point: IRT is Toman and IRR is
      // Rial, so this single value decides whether a stored 50000 is charged
      // as 50,000 Toman or as 5,000 Toman. Every price in this shop is stored
      // in Toman, so an env var here would only ever be a way to charge a
      // tenth of the right amount by accident.
      currency: 'IRT',
    },
  },

  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),

  // See parseTrustProxy above. The second flag is only so the boot can say
  // something when a production deployment never made the choice — unset is a
  // safe default but the wrong one behind a proxy, and it fails as a silent
  // lockout rather than as an error anybody would notice.
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  trustProxySet: Boolean((process.env.TRUST_PROXY ?? '').trim()),
};

// Shaparak wants a Referer from the shop's registered domain. Derived once
// here rather than parsed on every gateway call, and tolerant of a malformed
// url because nothing at import time is the right place to crash — the boot
// check below is, and it can say which variable is wrong.
const originOf = (url: string): string => {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
};

env.payment.callbackOrigin = originOf(env.payment.callbackUrl);

// Called once at boot, from PaymentsModule's gateway factory.
//
// Both of these urls are parsed with `new URL()` on the way through a request:
// the callback url's origin becomes the Referer on every gateway call, and the
// result url is rebuilt per callback to carry the outcome back to the
// storefront. A malformed one is therefore not a startup error that anybody
// notices — it is a throw *after* the money has been taken, on the single page
// where a 500 costs the most.
//
// So they are checked here, where the only cost of being wrong is a server
// that refuses to start. Neither is provider-specific: the mock gateway
// redirects to the result url just the same.
export const assertPaymentUrls = (): void => {
  const urls = [
    ['PAYMENT_CALLBACK_URL', env.payment.callbackUrl],
    ['PAYMENT_RESULT_URL', env.payment.resultUrl],
  ] as const;

  for (const [name, value] of urls) {
    let parsed: URL;

    try {
      parsed = new URL(value);
    } catch {
      throw new Error(
        `${name} is not a valid absolute url: "${value}". It must include the scheme, e.g. https://shop.example/payment/result.`,
      );
    }

    // `new URL()` is happy with mailto: and javascript:, and both of those
    // reach a browser from here — one as a Referer, the other as a redirect
    // the customer's browser follows.
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
      throw new Error(
        `${name} must be http or https, not "${parsed.protocol}": "${value}".`,
      );
  }
};
