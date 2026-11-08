/*
 * 판매 수량 저장 API (Vercel 서버리스 함수)
 *
 *   GET  /api/sales                      → { "2026-11-06": { "work-1": 2, ... }, ... }
 *   POST /api/sales  { day, id, delta }   → 해당 날짜·작품 수량을 +1 / -1 (0 아래로는 안 내려감)
 *
 * 저장소: Upstash Redis (Vercel 대시보드 → Storage 에서 연결하면 환경변수가 자동으로 들어옴)
 *   KV_REST_API_URL / KV_REST_API_TOKEN  또는  UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 */

const DAYS = ["2026-11-06", "2026-11-07", "2026-11-08"];
// 작품 id (화면 순서와 무관한 고유값). 작품을 추가하면 여기도 늘려야 저장됨
const WORK_IDS = Array.from({ length: 14 }, (_, i) => `work-${i + 1}`);
const key = (day) => `ue18:sales:${day}`;

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(path, body) {
  const r = await fetch(URL_ + path, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return r.json();
}

// HGETALL 결과 ["work-1","2","work-6","1"] → { "work-1": 2, "work-6": 1 }
function toObject(list) {
  const o = {};
  for (let i = 0; i + 1 < (list || []).length; i += 2) {
    const n = parseInt(list[i + 1], 10);
    if (WORK_IDS.includes(list[i]) && n > 0) o[list[i]] = n;
  }
  return o;
}

async function readAll() {
  const res = await redis("/pipeline", DAYS.map((d) => ["HGETALL", key(d)]));
  const out = {};
  DAYS.forEach((d, i) => { out[d] = toObject(res[i] && res[i].result); });
  return out;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!URL_ || !TOKEN) {
    res.status(503).json({ error: "storage-not-configured" });
    return;
  }
  try {
    if (req.method === "GET") {
      res.status(200).json(await readAll());
      return;
    }
    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
      const { day, id, delta } = body || {};
      if (!DAYS.includes(day) || !WORK_IDS.includes(id) || (delta !== 1 && delta !== -1)) {
        res.status(400).json({ error: "bad-request" });
        return;
      }
      // 원자적으로 증감, 0 아래로 내려가면 0으로 되돌림
      const r = await redis("/", ["HINCRBY", key(day), id, delta]);
      if (r.result < 0) await redis("/", ["HSET", key(day), id, 0]);
      res.status(200).json(await readAll());
      return;
    }
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "method-not-allowed" });
  } catch (e) {
    res.status(502).json({ error: "storage-error" });
  }
};
