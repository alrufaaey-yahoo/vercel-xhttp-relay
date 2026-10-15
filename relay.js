const http = require('http');
const https = require('https');
const { URL } = require('url');

const DEFAULT_TARGET_DOMAIN = 'https://vps.thumbayan.com:443';
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);
const STRIP_HEADERS = new Set([
  'host',
  'forwarded',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-forwarded-port',
  'x-vercel-id',
  'x-vercel-deployment-url',
  'x-vercel-sc-host',
]);

function getTargetBaseUrl() {
  const value = process.env.TARGET_DOMAIN || DEFAULT_TARGET_DOMAIN;
  return new URL(value.endsWith('/') ? value : `${value}/`);
}

function copyRequestHeaders(source) {
  const headers = {};
  let clientIp;

  for (const [name, value] of Object.entries(source)) {
    const lowerName = name.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lowerName) || STRIP_HEADERS.has(lowerName)) continue;
    if (lowerName === 'x-real-ip' || lowerName === 'x-forwarded-for') {
      clientIp ||= Array.isArray(value) ? value[0] : value;
      continue;
    }
    headers[name] = value;
  }

  if (clientIp) headers['x-forwarded-for'] = clientIp;
  return headers;
}

function copyResponseHeaders(source) {
  const headers = {};
  for (const [name, value] of Object.entries(source)) {
    if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase())) headers[name] = value;
  }
  return headers;
}

function relay(req, res) {
  let targetUrl;
  try {
    const base = getTargetBaseUrl();
    targetUrl = new URL(req.url || '/', base);
  } catch (error) {
    console.error('Invalid TARGET_DOMAIN:', error);
    res.statusCode = 500;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end('Misconfigured: TARGET_DOMAIN is invalid');
    return;
  }

  const transport = targetUrl.protocol === 'https:' ? https : http;
  const proxyReq = transport.request(
    targetUrl,
    {
      method: req.method,
      headers: copyRequestHeaders(req.headers),
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, copyResponseHeaders(proxyRes.headers));
      proxyRes.pipe(res);
    },
  );

  proxyReq.setTimeout(55_000, () => {
    proxyReq.destroy(new Error('Upstream request timed out'));
  });

  proxyReq.on('error', (error) => {
    console.error('Proxy request error:', error.message);
    if (res.headersSent) {
      res.destroy(error);
      return;
    }
    res.statusCode = 502;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end('Bad Gateway: Proxy Request Failed');
  });

  req.pipe(proxyReq);
}

module.exports = { relay };
