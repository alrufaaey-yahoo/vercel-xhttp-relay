import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';

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

const FORWARDED_HEADERS = new Set([
  'forwarded',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-forwarded-port',
]);

function getTargetUrl(req: IncomingMessage): URL {
  const targetDomain = process.env.TARGET_DOMAIN;
  if (!targetDomain) {
    throw new Error('TARGET_DOMAIN is not configured');
  }

  const base = new URL(targetDomain);
  const queryPath = (req as IncomingMessage & { query?: { path?: string | string[] } }).query?.path;
  const path = Array.isArray(queryPath) ? queryPath.join('/') : queryPath ?? '';
  const incomingUrl = new URL(req.url ?? '/', 'http://vercel.local');

  // Vercel's catch-all function normally supplies the path through req.query.path.
  // The fallback keeps the function usable with local Node-compatible test runners.
  const requestPath = path ? `/${path}` : incomingUrl.pathname.replace(/^\/api(?=\/|$)/, '') || '/';
  const target = new URL(requestPath, base);
  target.search = incomingUrl.search;
  return target;
}

function copyRequestHeaders(headers: IncomingHttpHeaders): Record<string, string | string[]> {
  const forwarded: Record<string, string | string[]> = {};
  let clientIp: string | undefined;

  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    const lowerName = name.toLowerCase();

    if (lowerName === 'x-real-ip' || lowerName === 'x-forwarded-for') {
      clientIp ??= Array.isArray(value) ? value[0] : value;
      continue;
    }
    if (lowerName === 'host' || lowerName.startsWith('x-vercel-')) continue;
    if (HOP_BY_HOP_HEADERS.has(lowerName) || FORWARDED_HEADERS.has(lowerName)) continue;

    forwarded[name] = value;
  }

  if (clientIp) forwarded['x-forwarded-for'] = clientIp;
  return forwarded;
}

function copyResponseHeaders(res: ServerResponse, headers: IncomingHttpHeaders): void {
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || HOP_BY_HOP_HEADERS.has(name.toLowerCase())) continue;
    res.setHeader(name, value);
  }
}

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  let target: URL;
  try {
    target = getTargetUrl(req);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end('Misconfigured: TARGET_DOMAIN is not set');
    return;
  }

  const request = (target.protocol === 'https:' ? httpsRequest : httpRequest)({
    protocol: target.protocol,
    hostname: target.hostname,
    port: target.port || undefined,
    path: `${target.pathname}${target.search}`,
    method: req.method,
    headers: {
      ...copyRequestHeaders(req.headers),
      host: target.host,
    },
  }, (proxyResponse) => {
    res.statusCode = proxyResponse.statusCode ?? 502;
    copyResponseHeaders(res, proxyResponse.headers);
    proxyResponse.pipe(res);
  });

  request.setTimeout(55_000, () => request.destroy(new Error('Upstream request timed out')));
  request.on('error', (error) => {
    console.error('Proxy request error:', error);
    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      res.end('Bad Gateway: Proxy request failed');
    } else {
      res.destroy(error);
    }
  });

  req.on('aborted', () => request.destroy(new Error('Client request aborted')));
  req.pipe(request);
}
