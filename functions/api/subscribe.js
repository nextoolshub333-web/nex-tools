/**
 * Cloudflare Pages Function - email subscription via Brevo
 *
 * Endpoint: POST /api/subscribe
 * Body: { email: "user@example.com", source?: "homepage" }
 *
 * Flow:
 *   1. Validate email
 *   2. Add contact to Brevo list (id 3 - Starter Kit)
 *   3. Send welcome email via template (id 1)
 *   4. Return { ok: true } on success
 *
 * Env vars needed (set in Cloudflare Pages > Settings > Environment variables):
 *   - BREVO_API_KEY         (secret)
 *   - BREVO_LIST_ID         (default: 3)
 *   - BREVO_TEMPLATE_ID     (default: 1)
 */

const DEFAULTS = {
  LIST_ID: 3,
  TEMPLATE_ID: 1,
  SENDER_EMAIL: 'nextools.hub333@gmail.com',
  SENDER_NAME: 'Nex Tools',
};

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  if (email.length > 254 || email.length < 5) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}

async function brevo(method, path, apiKey, body) {
  const res = await fetch(`https://api.brevo.com/v3${path}`, {
    method,
    headers: {
      'api-key': apiKey,
      'accept': 'application/json',
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { status: res.status, data };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const apiKey = env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('BREVO_API_KEY not configured');
    return json({ ok: false, error: 'server_misconfigured' }, 500);
  }

  const listId = parseInt(env.BREVO_LIST_ID || DEFAULTS.LIST_ID, 10);
  const templateId = parseInt(env.BREVO_TEMPLATE_ID || DEFAULTS.TEMPLATE_ID, 10);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  const email = (payload.email || '').trim().toLowerCase();
  const source = (payload.source || 'homepage').slice(0, 50);

  if (!isValidEmail(email)) {
    return json({ ok: false, error: 'invalid_email' }, 400);
  }

  // Step 1: create or update contact, add to list
  const contactRes = await brevo('POST', '/contacts', apiKey, {
    email,
    listIds: [listId],
    updateEnabled: true,
    attributes: {
      SOURCE: source,
      SIGNUP_DATE: new Date().toISOString().slice(0, 10),
    },
  });

  // 201 = created, 204 = updated. Both are OK.
  // 400 with "Contact already exist" also acceptable
  if (contactRes.status !== 201 && contactRes.status !== 204) {
    const errCode = contactRes.data && contactRes.data.code;
    if (errCode !== 'duplicate_parameter') {
      console.error('Brevo contact error:', contactRes.status, JSON.stringify(contactRes.data));
      return json({ ok: false, error: 'contact_failed' }, 502);
    }
    // duplicate - still send welcome email (they re-submitted)
  }

  // Step 2: send welcome email via template
  const emailRes = await brevo('POST', '/smtp/email', apiKey, {
    to: [{ email }],
    templateId,
    sender: {
      name: DEFAULTS.SENDER_NAME,
      email: DEFAULTS.SENDER_EMAIL,
    },
    replyTo: { email: DEFAULTS.SENDER_EMAIL, name: DEFAULTS.SENDER_NAME },
    tags: ['starter-kit-welcome', source],
  });

  if (emailRes.status !== 201) {
    console.error('Brevo email error:', emailRes.status, JSON.stringify(emailRes.data));
    // Contact was added but email failed. Still return ok - they can re-request.
    return json({ ok: true, warning: 'email_delayed', messageId: null }, 200);
  }

  return json({
    ok: true,
    messageId: emailRes.data && emailRes.data.messageId,
  });
}

// Reject non-POST methods
export async function onRequest(context) {
  if (context.request.method === 'POST') {
    return onRequestPost(context);
  }
  return json({ ok: false, error: 'method_not_allowed' }, 405);
}
