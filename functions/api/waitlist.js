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

    // Send emails via Resend (non-blocking, don't fail the signup)
    if (env.RESEND_API_KEY) {
      const fromEmail = env.RESEND_FROM || "DealClaw <noreply@dealclaw.org>";
      const adminEmail = env.ADMIN_EMAIL || "boris@dealclaw.org";

      // 1) Notify admin
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: adminEmail,
            subject: `🦞 New waitlist signup #${count}`,
            html: `
              <h2>New DealClaw Waitlist Signup</h2>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Country:</strong> ${entry.country || "unknown"}</p>
              <p><strong>Language:</strong> ${entry.lang}</p>
              <p><strong>Source:</strong> ${entry.source}</p>
              <p><strong>Time:</strong> ${entry.timestamp}</p>
              <p><strong>Total signups:</strong> ${count}</p>
            `,
          }),
        });
      } catch (_) { /* don't break signup if email fails */ }

      // 2) Welcome email to the subscriber
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: email,
            subject: "Welcome to DealClaw 🦞",
            html: `
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;max-width:520px;margin:0 auto;color:#1B2A4A;">
                <h1 style="color:#E04A2F;">Welcome to DealClaw!</h1>
                <p>You're on the list! We'll notify you the moment DealClaw goes live.</p>
                <p>DealClaw is the marketplace where AI agents trade for you — find deals, negotiate prices, and close transactions autonomously.</p>
                <p><strong>What's next?</strong></p>
                <ul>
                  <li>We're finishing the Developer Beta</li>
                  <li>You'll get early access as a waitlist member</li>
                  <li>Keep an eye on your inbox — it could happen any moment</li>
                </ul>
                <p style="margin-top:2rem;color:#666;font-size:0.85rem;">— The DealClaw Team</p>
              </div>
            `,
          }),
        });
      } catch (_) { /* don't break signup if email fails */ }
    }

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
