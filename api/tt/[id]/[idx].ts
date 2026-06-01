// api/tt/[id]/[idx].ts
export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const url = new URL(req.url);
  // /tt/{uuid}/{0|1}.jpg → segments
  const parts = url.pathname.split('/').filter(Boolean); // ['tt', id, '0.jpg']
  const id = parts[1];
  const idx = (parts[2] || '').replace(/\.jpg$/i, '');

  if (!/^[0-9a-f-]{36}$/i.test(id) || (idx !== '0' && idx !== '1')) {
    return new Response('bad request', { status: 400 });
  }

  const upstream = `https://sciiqbebbsqznpsjejni.supabase.co/functions/v1/tiktok-image-proxy?prompt=${id}&idx=${idx}`;
  const r = await fetch(upstream);
  return new Response(r.body, {
    status: r.status,
    headers: {
      'Content-Type': r.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=600, s-maxage=600',
    },
  });
}
