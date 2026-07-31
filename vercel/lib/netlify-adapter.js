'use strict';

function normalizeBody(req, rawBody) {
  if (rawBody != null) return rawBody;
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (req.body == null) return '';
  return JSON.stringify(req.body);
}

function queryParams(req) {
  const out = {};
  Object.keys(req.query || {}).forEach(function (key) {
    const value = req.query[key];
    out[key] = Array.isArray(value) ? value[value.length - 1] : value;
  });
  return out;
}

function readRawBody(req) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    req.on('data', function (chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', function () {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

async function runNetlifyHandler(req, res, handler, options) {
  const rawBody = options && options.rawBody ? await readRawBody(req) : null;
  const result = await handler({
    httpMethod: req.method,
    headers: req.headers || {},
    body: normalizeBody(req, rawBody),
    queryStringParameters: queryParams(req),
    isBase64Encoded: false
  });

  Object.keys(result.headers || {}).forEach(function (name) {
    res.setHeader(name, result.headers[name]);
  });
  res.statusCode = result.statusCode || 200;
  res.end(result.body || '');
}

module.exports = { runNetlifyHandler };
