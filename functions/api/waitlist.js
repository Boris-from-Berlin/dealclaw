export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid email" }), {
        status: 400,
        headers,
      });
    }

    // Check if already registered
    const existing = await env.WAITLIST.get(email);
    if (existing) {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200,
        headers,
      });
    }

    // Store email with timestamp and metadata
    const entry = {
      email,
      timestamp: new Date().toISOString(),
      source: body.source || "landing",
      lang: body.lang || "en",
      userAgent: request.headers.get("User-Agent") || "",
      country: request.cf?.country || "",
    };

    await env.WAITLIST.put(email, JSON.stringify(entry));

    // Update counter
    const countStr = await env.WAITLIST.get("__count__");
    const count = (parseInt(countStr) || 0) + 1;
    await env.WAITLIST.put("__count__", String(count));

    return new Response(JSON.stringify({ ok: true, count }), {
      status: 200,
      headers,
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Server error" }), {
      status: 500,
      headers,
    });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
