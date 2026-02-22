export async function onRequestGet(context) {
  const { request, env } = context;

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  // Simple secret key auth
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!key || key !== env.ADMIN_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers,
    });
  }

  try {
    // List all keys (paginated, max 1000 per call)
    const entries = [];
    let cursor = null;

    do {
      const listOpts = { limit: 1000 };
      if (cursor) listOpts.cursor = cursor;

      const list = await env.WAITLIST.list(listOpts);

      for (const key of list.keys) {
        if (key.name === "__count__") continue;
        const value = await env.WAITLIST.get(key.name);
        try {
          entries.push(JSON.parse(value));
        } catch {
          entries.push({ email: key.name, raw: value });
        }
      }

      cursor = list.list_complete ? null : list.cursor;
    } while (cursor);

    const count = await env.WAITLIST.get("__count__");

    return new Response(JSON.stringify({
      count: parseInt(count) || entries.length,
      entries,
    }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers,
    });
  }
}
