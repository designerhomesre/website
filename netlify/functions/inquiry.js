/**
 * DESIGNER HOMES — Website inquiry handler (quote, contact, lender-inquiry forms).
 *
 * WHY THIS EXISTS: the public forms were built for Netlify Forms (POST to "/").
 * The site is hosted on Vercel, where that request is answered by the static
 * homepage and the submission is silently discarded. This function receives the
 * same form fields and emails them to the owner via Resend (already used by the
 * book store), replying to the visitor's address.
 *
 * Env: RESEND_API_KEY (required), INQUIRY_TO_EMAIL (optional; falls back to
 * BOOK_ADMIN_EMAIL, then info@designerhomesre.com), BOOK_FROM_EMAIL (optional).
 */
'use strict';

const FROM = process.env.BOOK_FROM_EMAIL || 'Designer Homes Real Estate <info@designerhomesre.com>';
const TO = process.env.INQUIRY_TO_EMAIL || process.env.BOOK_ADMIN_EMAIL || 'info@designerhomesre.com';
const MAX_FIELD = 5000;
const MAX_BODY = 60000;

const FORM_LABELS = {
  'quote-form': 'Appraisal Quote Request',
  'contact': 'Contact Form Message',
  'lender-inquiry': 'Lender / Panel Inquiry',
  'measurement-quote': 'Home Measurement Request',
  'client-reviews': 'Client Review Submission'
};
// Fields that are page metadata or anti-spam, never shown in the email.
const SKIP = new Set(['form-name', 'bot-field', 'g-recaptcha-response', 'file_upload']);

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

function json(statusCode, obj) {
  return {
    statusCode: statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(obj)
  };
}

function parseBody(event) {
  const raw = event.body || '';
  if (raw.length > MAX_BODY) return null;
  const ct = String((event.headers && (event.headers['content-type'] || event.headers['Content-Type'])) || '');
  const fields = {};
  if (ct.indexOf('application/json') !== -1) {
    try {
      const obj = JSON.parse(raw);
      Object.keys(obj || {}).forEach(function (k) {
        const v = obj[k];
        fields[k] = Array.isArray(v) ? v.join(', ') : (v == null ? '' : String(v));
      });
    } catch (e) { return null; }
    return fields;
  }
  const params = new URLSearchParams(raw);
  params.forEach(function (v, k) {
    fields[k] = fields[k] ? fields[k] + ', ' + v : v; // repeated keys (checkboxes) join
  });
  return fields;
}

function pickEmail(fields) {
  const candidates = ['email', 'contact_email', 'Email'];
  for (let i = 0; i < candidates.length; i++) {
    const v = fields[candidates[i]];
    if (v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return v.trim();
  }
  return null;
}

function pickName(fields) {
  return (fields.name || fields.contact_name || fields.full_name ||
    [fields.first_name, fields.last_name].filter(Boolean).join(' ') || '').trim();
}

function prettyLabel(key) {
  return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

function render(formLabel, fields, meta) {
  const rows = Object.keys(fields).filter(function (k) { return !SKIP.has(k) && String(fields[k]).trim() !== ''; })
    .map(function (k) {
      const v = String(fields[k]).slice(0, MAX_FIELD);
      return '<tr><td style="padding:6px 10px;border-bottom:1px solid #e9ecef;color:#6c757d;white-space:nowrap;vertical-align:top;">' +
        esc(prettyLabel(k)) + '</td><td style="padding:6px 10px;border-bottom:1px solid #e9ecef;white-space:pre-wrap;">' + esc(v) + '</td></tr>';
    }).join('');
  return '' +
    '<div style="font-family:Segoe UI,Arial,sans-serif;color:#2C3E50;max-width:640px;">' +
      '<div style="background:#2C3E50;color:#fff;padding:18px 22px;border-radius:10px 10px 0 0;">' +
        '<div style="font-size:17px;font-weight:700;">New website inquiry</div>' +
        '<div style="color:#C9A96E;font-size:13px;letter-spacing:.06em;text-transform:uppercase;">' + esc(formLabel) + '</div>' +
      '</div>' +
      '<div style="border:1px solid #e9ecef;border-top:0;border-radius:0 0 10px 10px;padding:16px 10px;">' +
        '<table style="border-collapse:collapse;width:100%;font-size:14px;">' + rows + '</table>' +
        '<p style="font-size:12px;color:#6c757d;margin:14px 10px 0;">Received ' + esc(meta.when) +
          (meta.page ? ' from ' + esc(meta.page) : '') + '. Reply to this email to respond to the visitor.</p>' +
      '</div>' +
    '</div>';
}

function textVersion(formLabel, fields) {
  return formLabel + '\n\n' + Object.keys(fields)
    .filter(function (k) { return !SKIP.has(k) && String(fields[k]).trim() !== ''; })
    .map(function (k) { return prettyLabel(k) + ': ' + String(fields[k]).slice(0, MAX_FIELD); }).join('\n');
}

async function sendResend(payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  if (!res.ok) throw new Error('Resend ' + res.status + ': ' + text);
  return text;
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { 'Allow': 'POST' }, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  const fields = parseBody(event);
  if (!fields) return json(400, { ok: false, error: 'Could not read the form submission.' });

  // Honeypot: real visitors never fill this hidden field.
  if (fields['bot-field'] && fields['bot-field'].trim() !== '') return json(200, { ok: true });

  const formName = String(fields['form-name'] || '').trim();
  const formLabel = FORM_LABELS[formName] || (formName ? 'Website Form: ' + formName : 'Website Form');
  const visitorEmail = pickEmail(fields);
  const visitorName = pickName(fields);
  if (!visitorEmail) return json(400, { ok: false, error: 'Please enter a valid email address.' });

  if (!process.env.RESEND_API_KEY) {
    console.error('[inquiry] RESEND_API_KEY missing — inquiry NOT delivered', { formName: formName, visitorEmail: visitorEmail });
    return json(503, { ok: false, error: 'Email delivery is not configured.' });
  }

  const meta = {
    when: new Date().toUTCString(),
    page: (event.headers && (event.headers.referer || event.headers.Referer)) || ''
  };
  const subject = '[Website] ' + formLabel + (visitorName ? ' — ' + visitorName : '');

  try {
    await sendResend({
      from: FROM,
      to: [TO],
      reply_to: visitorEmail,
      subject: subject,
      html: render(formLabel, fields, meta),
      text: textVersion(formLabel, fields)
    });
  } catch (err) {
    console.error('[inquiry] send failed', err && err.message);
    return json(502, { ok: false, error: 'We could not send your message right now.' });
  }

  return json(200, { ok: true });
};
