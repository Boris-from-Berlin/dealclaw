// Cloudflare Worker: POST /api/auth/register
// KV: USERS — stores user records by email
// Env: JWT_SECRET — secret for JWT signing

import { hashPassword, createJWT } from './_shared.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS — restrict to known origins
  const origin = request.headers.get("Origin") || "";
  const allowedOrigins = ["https://dealclaw.org", "https://www.dealclaw.org", "http://localhost:8788", "http://localhost:3000"];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : "https://dealclaw.org";

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': corsOrigin,
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
    return new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), { status: 500, headers });
  }
}

export async function onRequestOptions(context) {
  const origin = context.request.headers.get("Origin") || "";
  const allowedOrigins = ["https://dealclaw.org", "https://www.dealclaw.org", "http://localhost:8788", "http://localhost:3000"];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : "https://dealclaw.org";

  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

