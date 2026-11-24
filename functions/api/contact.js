// Receives the contact form and emails it to the business inbox using Resend (resend.com).
// Runs on Cloudflare Pages at  /api/contact
//
// Environment variables (Cloudflare Pages → Settings → Variables and Secrets):
//   RESEND_API_KEY  — required. Create it in the Resend dashboard (store as a Secret).
//   CONTACT_TO      — optional. Where enquiries are delivered. Default: zeyad@ez-recruitment.com
//   CONTACT_FROM    — optional. Sender, e.g. "EZ Recruitment Website <website@ez-recruitment.com>".
//                     The domain must be verified in Resend. Default: Resend's test sender
//                     (works only while testing, and only delivers to your own Resend account email).

const DEFAULT_TO = 'zeyad@ez-recruitment.com';
const DEFAULT_FROM = 'EZ Recruitment Website <onboarding@resend.dev>';

const LIMITS = {
  name: 120, company: 160, email: 160, phone: 40, country: 80, industry: 80, jobCategories: 200, workersNeeded: 60,
  timeline: 120, requirements: 3000, position: 120, companyWebsite: 200, services: 200, cooperation: 200, message: 4000,
};
const TYPES = { employer: 'Employer', agency: 'Partnership', other: 'General' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clean = (v, max) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
const oneLine = (v) => v.replace(/[\r\n]+/g, ' ');

function respond(request, ok, status, body) {
  const wantsJson = (request.headers.get('Accept') || '').includes('application/json');
  if (wantsJson) {
    return new Response(JSON.stringify({ ok, ...body }), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }
  if (ok) return Response.redirect(new URL('/contact/thank-you/', request.url).href, 303);
  const html = `<!doctype html><meta charset="utf-8"><title>Enquiry not sent</title><body style="font-family:system-ui,sans-serif;padding:2rem;color:#142D4E"><h1>Your enquiry could not be sent</h1><p>Please go back and try again, or email us directly at <a href="mailto:${DEFAULT_TO}">${DEFAULT_TO}</a>.</p></body>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function onRequestPost({ request, env }) {
  // Only accept submissions that come from this website.
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) {
    return respond(request, false, 403, { error: 'forbidden' });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return respond(request, false, 400, { error: 'invalid_request' });
  }

  // Spam trap: bots fill in the hidden "website" field. Pretend success and drop it.
  if (clean(form.get('website'), 200)) return respond(request, true, 200, {});

  const data = Object.fromEntries(Object.entries(LIMITS).map(([k, max]) => [k, clean(form.get(k), max)]));
  const type = TYPES[clean(form.get('inquiryType'), 20)] ? clean(form.get('inquiryType'), 20) : 'employer';
  const consent = clean(form.get('consent'), 10) === 'yes';
  const required = { employer: ['name', 'company', 'email', 'industry', 'requirements'], agency: ['name', 'company', 'email', 'message'], other: ['name', 'company', 'email', 'message'] }[type];
  const missing = required.filter((k) => !data[k]);
  if (missing.length || !EMAIL_RE.test(data.email) || !consent) {
    return respond(request, false, 422, { error: 'validation', fields: missing });
  }

  if (!env.RESEND_API_KEY) {
    return respond(request, false, 503, { error: 'not_configured' });
  }

  const row = (label, v) => `${label}: ${v || '—'}`;
  const lines = [
    `New ${TYPES[type].toUpperCase()} inquiry from the EZ Recruitment website`,
    '',
    row('Inquiry type', TYPES[type]),
    row('Name', data.name),
    row('Company', data.company),
    row('Business email', data.email),
    row('Phone / WhatsApp', data.phone),
    row('Country', data.country),
  ];
  if (type === 'employer') {
    lines.push(row('Industry', data.industry), row('Job categories', data.jobCategories), row('Workers required', data.workersNeeded), row('Timeline', data.timeline), '', 'Workforce requirements:', data.requirements);
  }
  if (type === 'agency') {
    lines.push(row('Position', data.position), row('Website', data.companyWebsite), row('Recruitment services', data.services), row('Areas of cooperation', data.cooperation));
  }
  lines.push('', 'Message:', data.message || '—', '', 'Privacy consent: given');
  const text = lines.join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.CONTACT_FROM || DEFAULT_FROM,
      to: [(type === 'agency' && env.PARTNER_TO) || env.CONTACT_TO || DEFAULT_TO],
      reply_to: data.email,
      subject: oneLine(`[${TYPES[type]}] ${data.company}${type === 'employer' ? ` (${data.industry})` : ''}`),
      text,
    }),
  }).catch(() => null);

  if (!res || !res.ok) {
    return respond(request, false, 502, { error: 'delivery_failed' });
  }
  return respond(request, true, 200, {});
}

// Anything other than POST is not allowed.
export async function onRequest({ request }) {
  return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
}
