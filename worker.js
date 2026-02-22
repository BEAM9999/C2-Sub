/**
 * C2 Sub — Cloudflare Worker (Free proxy backend)
 *
 * ══ วิธี Deploy (ฟรี, ไม่ต้องบัตรเครดิต) ══
 * 1. ไปที่ https://workers.cloudflare.com/  →  Sign up ฟรี
 * 2. Dashboard → Workers & Pages → Create → Create Worker
 * 3. ก็อปโค้ดทั้งหมดนี้ไปวางแทน → Save & Deploy
 * 4. ได้ URL เช่น  https://c2sub.YOURNAME.workers.dev
 * 5. เปิด index.html → บรรทัด WORKER_URL → ใส่ URL นั้น
 *
 * ══ Endpoints ══
 * POST /api/proxy   → forward ไป get.downsub.com (ต้องการ Origin/Referer header)
 * POST /api/editsub → forward ไป editsub.com/api/translate
 * GET  /api/fetch?url=... → proxy ดาวน์โหลดไฟล์ subtitle
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

addEventListener('fetch', event => {
  event.respondWith(handle(event.request).catch(err =>
    new Response(JSON.stringify({ error: err.message }), {
      status: 502, headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  ));
});

async function handle(req) {
  const url = new URL(req.url);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  // ── POST /api/proxy → downsub.com ──────────────────────────────────
  if (url.pathname === '/api/proxy' && req.method === 'POST') {
    const body = await req.text();
    const resp = await fetch('https://get.downsub.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://downsub.com',
        'Referer': 'https://downsub.com/',
        'User-Agent': UA,
      },
      body,
    });
    const data = await resp.text();
    return new Response(data, {
      status: resp.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── POST /api/editsub → editsub.com/api/translate ──────────────────
  if (url.pathname === '/api/editsub' && req.method === 'POST') {
    const body = await req.text();
    const resp = await fetch('https://editsub.com/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://editsub.com',
        'Referer': 'https://editsub.com/edit',
        'User-Agent': UA,
      },
      body,
    });
    const data = await resp.text();
    return new Response(data, {
      status: resp.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── GET /api/fetch?url=... → proxy subtitle file ───────────────────
  if (url.pathname === '/api/fetch') {
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return new Response('{"error":"missing url"}', {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }
    const resp = await fetch(targetUrl, {
      headers: { 'User-Agent': UA }
    });
    const data = await resp.arrayBuffer();
    const ct = resp.headers.get('Content-Type') || 'text/plain; charset=utf-8';
    return new Response(data, {
      status: resp.status,
      headers: { ...CORS, 'Content-Type': ct },
    });
  }

  return new Response('Not found', { status: 404, headers: CORS });
}
