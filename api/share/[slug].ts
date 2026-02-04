import type { VercelRequest, VercelResponse } from "@vercel/node";

const SUPABASE_EDGE_BASE =
  "https://sciiqbebbsqznpsjejni.supabase.co/functions/v1/og-meta-renderer";

// Known social crawlers
const BOT_UA_PARTS = [
  "facebookexternalhit",
  "facebot",
  "twitterbot",
  "instagram",
  "linkedinbot",
  "slackbot",
  "discordbot",
  "whatsapp",
  "telegrambot",
  "pinterest",
  "applebot",
];

function isBot(userAgent: string | undefined) {
  const ua = (userAgent || "").toLowerCase();
  return BOT_UA_PARTS.some((bot) => ua.includes(bot));
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const slug = req.query.slug as string;

  if (!slug) {
    return res.status(400).send("Missing slug");
  }

  const canonicalUrl = `https://www.thekingofprompt.com/prompts/${slug}`;

  const userAgent = req.headers["user-agent"] as string | undefined;

  // 👤 HUMAN BROWSER → Fast redirect
  if (!isBot(userAgent)) {
    res.setHeader("Cache-Control", "no-store");
    return res.redirect(302, canonicalUrl);
  }

  // 🤖 BOT → Fetch OG HTML from Supabase
  try {
    const targetUrl = `${SUPABASE_EDGE_BASE}?slug=${slug}`;

    const upstream = await fetch(targetUrl, {
      headers: {
        // Force bot UA to Supabase so it returns OG HTML
        "user-agent":
          "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        accept: "text/html,*/*",
      },
      redirect: "manual",
    });

    const html = await upstream.text();

    res.status(200);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");

    return res.send(html);
  } catch (error) {
    console.error("OG proxy error:", error);

    // Fail safe → redirect to main site
    return res.redirect(302, canonicalUrl);
  }
}
