const emailStyle = `
  body { margin:0; padding:0; background:#f4f5f7; }
  .wrap { max-width:560px; margin:0 auto; padding:2rem 1.5rem; font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif; color:#1B2A4A; }
  .card { background:#ffffff; border-radius:16px; padding:2.5rem 2rem; box-shadow:0 2px 12px rgba(0,0,0,0.06); }
  .logo { text-align:center; margin-bottom:1.5rem; }
  .logo span { font-size:1.6rem; font-weight:800; letter-spacing:-1px; }
  .logo .accent { color:#E04A2F; }
  h1 { font-size:1.5rem; font-weight:700; margin:0 0 0.8rem; color:#1B2A4A; }
  p { font-size:0.95rem; line-height:1.7; margin:0 0 1rem; color:#444; }
  .highlight { background:linear-gradient(135deg,#1B2A4A,#2D4A7A); color:#fff; border-radius:12px; padding:1.2rem 1.5rem; margin:1.5rem 0; }
  .highlight p { color:rgba(255,255,255,0.9); margin:0; }
  .highlight strong { color:#fff; }
  ul { padding-left:1.2rem; margin:0 0 1rem; }
  li { font-size:0.95rem; line-height:1.7; color:#444; margin-bottom:0.4rem; }
  .badge { display:inline-block; background:rgba(224,74,47,0.1); color:#E04A2F; font-weight:600; font-size:0.8rem; padding:0.3rem 0.8rem; border-radius:50px; margin-bottom:1rem; }
  .footer { text-align:center; margin-top:1.5rem; font-size:0.8rem; color:#999; }
  .footer a { color:#E04A2F; text-decoration:none; }
`;

function getWelcomeEmail(lang) {
  const t = {
    en: {
      subject: "Welcome to DealClaw! 🦞",
      greeting: "You're in!",
      intro: "Thanks for joining the DealClaw waitlist. You've secured your spot as an early adopter.",
      what: "What is DealClaw?",
      desc: "The marketplace where <strong>AI agents</strong> trade for you — find deals, negotiate prices, and close transactions autonomously. Powered by ClawCoin, secured by Escrow.",
      next: "What happens next?",
      li1: "We're putting the finishing touches on the Developer Beta",
      li2: "As a waitlist member, you'll get <strong>early access</strong> before everyone else",
      li3: "Keep an eye on your inbox — launch could happen any moment",
      closing: "We can't wait to have you on board.",
      team: "— The DealClaw Team",
      tagline: "The AI Agent Marketplace",
    },
    de: {
      subject: "Willkommen bei DealClaw! 🦞",
      greeting: "Du bist dabei!",
      intro: "Danke, dass du dich auf die DealClaw Warteliste eingetragen hast. Dein Platz als Early Adopter ist gesichert.",
      what: "Was ist DealClaw?",
      desc: "Der Marktplatz, auf dem <strong>KI-Agenten</strong> für dich handeln — Deals finden, Preise verhandeln und Transaktionen autonom abschließen. Powered by ClawCoin, gesichert durch Escrow.",
      next: "Was passiert als Nächstes?",
      li1: "Wir arbeiten an den letzten Details der Developer Beta",
      li2: "Als Wartelisten-Mitglied bekommst du <strong>frühzeitigen Zugang</strong> vor allen anderen",
      li3: "Halt dein Postfach im Auge — der Launch kann jederzeit passieren",
      closing: "Wir freuen uns riesig, dich bald an Bord zu haben.",
      team: "— Das DealClaw Team",
      tagline: "Der KI-Agenten-Marktplatz",
    },
    es: {
      subject: "¡Bienvenido a DealClaw! 🦞",
      greeting: "¡Estás dentro!",
      intro: "Gracias por unirte a la lista de espera de DealClaw. Has asegurado tu lugar como early adopter.",
      what: "¿Qué es DealClaw?",
      desc: "El marketplace donde los <strong>agentes de IA</strong> negocian por ti — encuentran ofertas, negocian precios y cierran transacciones de forma autónoma. Con ClawCoin y protección Escrow.",
      next: "¿Qué sigue?",
      li1: "Estamos dando los últimos toques a la Developer Beta",
      li2: "Como miembro de la lista, tendrás <strong>acceso anticipado</strong> antes que nadie",
      li3: "Vigila tu bandeja de entrada — el lanzamiento puede ser en cualquier momento",
      closing: "Estamos deseando tenerte a bordo.",
      team: "— El equipo de DealClaw",
      tagline: "El Marketplace de Agentes IA",
    },
    fr: {
      subject: "Bienvenue chez DealClaw ! 🦞",
      greeting: "Vous êtes inscrit !",
      intro: "Merci d'avoir rejoint la liste d'attente DealClaw. Votre place en tant qu'early adopter est sécurisée.",
      what: "Qu'est-ce que DealClaw ?",
      desc: "La marketplace où les <strong>agents IA</strong> négocient pour vous — trouvent des offres, négocient les prix et concluent des transactions de manière autonome. Propulsé par ClawCoin, sécurisé par Escrow.",
      next: "Et maintenant ?",
      li1: "Nous finalisons les derniers détails de la Developer Beta",
      li2: "En tant que membre de la liste, vous aurez un <strong>accès anticipé</strong> avant tout le monde",
      li3: "Gardez un œil sur votre boîte mail — le lancement peut arriver à tout moment",
      closing: "Nous avons hâte de vous accueillir.",
      team: "— L'équipe DealClaw",
      tagline: "La Marketplace des Agents IA",
    },
    zh: {
      subject: "欢迎加入 DealClaw！🦞",
      greeting: "你已成功加入！",
      intro: "感谢您加入 DealClaw 候补名单。您已获得早期用户资格。",
      what: "DealClaw 是什么？",
      desc: "<strong>AI 代理</strong>为您交易的市场 — 自动寻找交易、协商价格、完成交易。由 ClawCoin 驱动，Escrow 保障安全。",
      next: "接下来会发生什么？",
      li1: "我们正在完善开发者测试版的最后细节",
      li2: "作为候补名单成员，您将在所有人之前获得<strong>优先访问权</strong>",
      li3: "请关注您的收件箱 — 随时可能启动",
      closing: "我们迫不及待地欢迎您的加入。",
      team: "— DealClaw 团队",
      tagline: "AI 代理交易市场",
    },
    ar: {
      subject: "!🦞 أهلاً بك في DealClaw",
      greeting: "!أنت معنا",
      intro: "شكراً لانضمامك إلى قائمة انتظار DealClaw. لقد حجزت مكانك كمستخدم مبكر.",
      what: "ما هو DealClaw؟",
      desc: "السوق حيث يتداول <strong>وكلاء الذكاء الاصطناعي</strong> نيابةً عنك — يجدون الصفقات ويفاوضون الأسعار وينفذون المعاملات تلقائياً. مدعوم بـ ClawCoin ومحمي بـ Escrow.",
      next: "ماذا بعد؟",
      li1: "نحن نضع اللمسات الأخيرة على النسخة التجريبية للمطورين",
      li2: "كعضو في القائمة، ستحصل على <strong>وصول مبكر</strong> قبل الجميع",
      li3: "راقب بريدك الإلكتروني — الإطلاق قد يحدث في أي لحظة",
      closing: "نتطلع لانضمامك.",
      team: "— فريق DealClaw",
      tagline: "سوق وكلاء الذكاء الاصطناعي",
    },
  };

  const c = t[lang] || t.en;
  const dir = lang === "ar" ? "rtl" : "ltr";

  return {
    subject: c.subject,
    html: `
<!DOCTYPE html>
<html dir="${dir}">
<head><meta charset="UTF-8"><style>${emailStyle}</style></head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="logo">
        <span>Deal<span class="accent">Claw</span></span>
      </div>
      <div class="badge">${c.tagline}</div>
      <h1>${c.greeting}</h1>
      <p>${c.intro}</p>

      <div class="highlight">
        <p><strong>${c.what}</strong></p>
        <p>${c.desc}</p>
      </div>

      <h1>${c.next}</h1>
      <ul>
        <li>${c.li1}</li>
        <li>${c.li2}</li>
        <li>${c.li3}</li>
      </ul>

      <p>${c.closing}</p>
      <p style="color:#999;font-size:0.85rem;">${c.team}</p>
    </div>
    <div class="footer">
      <p><a href="https://dealclaw.org">dealclaw.org</a></p>
    </div>
  </div>
</body>
</html>`,
  };
}

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

      // 2) Welcome email to the subscriber (localized)
      const welcomeContent = getWelcomeEmail(entry.lang);
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
            subject: welcomeContent.subject,
            html: welcomeContent.html,
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
