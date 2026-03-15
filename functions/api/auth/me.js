// Cloudflare Worker: GET /api/auth/me — Token validation

export async function onRequestGet(context) {
  const { request, env } = context;

  // CORS — restrict to known origins
  const origin = request.headers.get("Origin") || "";
  const allowedOrigins = ["https://dealclaw.org", "https://www.dealclaw.org", "http://localhost:8788", "http://localhost:3000"];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : "https://dealclaw.org";

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ ok: false, error: 'No token provided' }), { status: 401, headers });
    }

    const token = auth.slice(7);
    const payload = await verifyJWT(token, env.JWT_SECRET);

    if (!payload) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid or expired token' }), { status: 401, headers });
    }

    // Optionally verify user still exists in KV
    const raw = await env.USERS.get(payload.email);
    if (!raw) {
      return new Response(JSON.stringify({ ok: false, error: 'User not found' }), { status: 404, headers });
    }

    return new Response(JSON.stringify({
      ok: true,
      user: { email: payload.email, createdAt: payload.createdAt }
    }), { headers });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'Server error' }), { status: 500, headers });
  }
}

export async function onRequestOptions(context) {
  const origin = context.request.headers.get("Origin") || "";
  const allowedOrigins = ["https://dealclaw.org", "https://www.dealclaw.org", "http://localhost:8788", "http://localhost:3000"];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : "https://dealclaw.org";

  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, claimsB64, sigB64] = parts;
    const data = headerB64 + '.' + claimsB64;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );

    // Restore base64 padding
    const sigStr = sigB64.replace(/-/g, '+').replace(/_/g, '/');
    const sigPadded = sigStr + '='.repeat((4 - sigStr.length % 4) % 4);
    const sigBytes = Uint8Array.from(atob(sigPadded), c => c.charCodeAt(0));

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data));
    if (!valid) return null;

    // Decode claims
    const claimsStr = claimsB64.replace(/-/g, '+').replace(/_/g, '/');
    const claimsPadded = claimsStr + '='.repeat((4 - claimsStr.length % 4) % 4);
    const claims = JSON.parse(atob(claimsPadded));

    // Check expiry
    if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return claims;
  } catch (e) {
    return null;
  }
}
