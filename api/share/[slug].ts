import type { VercelRequest, VercelResponse } from "@vercel/node";

const SUPABASE_EDGE_BASE =
  "https://sciiqbebbsqznpsjejni.supabase.co/functions/v1/og-meta-renderer";

function stripHopByHopHeaders(headers: Headers) {
  // Hop-by-hop headers should not be forwarded by proxies
  const hopByHop = new Set([
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
  ]);

  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (!hopByHop.has(key.toLowerCase())) out[key] = value;
  });
  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const slug = (req.query.slug as string) || "";

    if (!slug) {
      res.status(400).send("Missing slug");
      return;
    }

    // Preserve extra query params (utm, ref, etc.)
    const incomingUrl = new URL(req.url || "/", "https://share.thekingofprompt.com");
    const params = new URLSearchParams(incomingUrl.searchParams);
    params.set("slug", slug);

    const target = `${SUPABASE_EDGE_BASE}?${params.toString()}`;

    const upstream = await fetch(target, {
      method: "GET",
      headers: {
        // pass user-agent so your edge function can do bot detection reliably
        "user-agent": req.headers["user-agent"] || "",
        "accept": req.headers["accept"] || "text/html,*/*",
      },
      redirect: "manual",
    });

    const body = await upstream.arrayBuffer();

    // Copy upstream headers (sanitize)
    const headers = stripHopByHopHeaders(upstream.headers);

    // Ensure correct content type for OG HTML
    headers["content-type"] = headers["content-type"] || "text/html; charset=utf-8";

    // Avoid caching surprises during rollout
    headers["cache-control"] = "no-store";

    res.status(upstream.status);
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    res.send(Buffer.from(body));
  } catch (e: any) {
    res.status(500).send(`Proxy error: ${e?.message || "unknown"}`);
  }
}
