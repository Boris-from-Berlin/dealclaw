// Cloudflare Worker: POST /api/auth/login

import { hexToBytes, hashPassword, createJWT } from './_shared.js';

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

    if (!email || !password) {
      return new Response(JSON.stringify({ ok: false, error: 'Email and password are required' }), { status: 400, headers });
    }

    // Fetch user from KV
    const raw = await env.USERS.get(email.toLowerCase());
    if (!raw) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid email or password' }), { status: 401, headers });
    }

    const user = JSON.parse(raw);

    // Verify password
    const salt = hexToBytes(user.salt);
    const hash = await hashPassword(password, salt);

    if (hash !== user.passwordHash) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid email or password' }), { status: 401, headers });
    }

    // Generate JWT
    const token = await createJWT({ email: user.email, createdAt: user.createdAt }, env.JWT_SECRET);

    return new Response(JSON.stringify({
      ok: true,
      token: token,
      user: { email: user.email, createdAt: user.createdAt }
    }), { headers });

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

