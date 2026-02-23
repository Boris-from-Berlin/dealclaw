// Cloudflare Worker: POST /api/auth/register
// KV: USERS — stores user records by email
// Env: JWT_SECRET — secret for JWT signing

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { email, password } = await request.json();

    // Validate
    if (!email || !password) {
      return new Response(JSON.stringify({ ok: false, error: 'Email and password are required' }), { status: 400, headers });
    }
    if (password.length < 6) {
      return new Response(JSON.stringify({ ok: false, error: 'Password must be at least 6 characters' }), { status: 400, headers });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid email address' }), { status: 400, headers });
    }

    // Check if user exists
    const existing = await env.USERS.get(email.toLowerCase());
    if (existing) {
      return new Response(JSON.stringify({ ok: false, error: 'Email already registered' }), { status: 409, headers });
    }

    // Hash password using Web Crypto API (PBKDF2)
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hash = await hashPassword(password, salt);

    // Create user record
    const user = {
      email: email.toLowerCase(),
      passwordHash: hash,
      salt: saltHex,
      createdAt: new Date().toISOString(),
      lang: 'en',
    };

    // Store in KV
    await env.USERS.put(email.toLowerCase(), JSON.stringify(user));

    // Generate JWT
    const token = await createJWT({ email: user.email, createdAt: user.createdAt }, env.JWT_SECRET);

    return new Response(JSON.stringify({
      ok: true,
      token: token,
      user: { email: user.email, createdAt: user.createdAt }
    }), { status: 201, headers });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'Server error' }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

// ===== CRYPTO HELPERS =====

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function createJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = { ...payload, iat: now, exp: now + 86400 * 30 }; // 30 days

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const claimsB64 = btoa(JSON.stringify(claims)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const data = headerB64 + '.' + claimsB64;
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return data + '.' + sigB64;
}
