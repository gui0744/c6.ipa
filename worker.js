function json(data, status=200) {
  return new Response(JSON.stringify(data), {status, headers: {"content-type":"application/json", "access-control-allow-origin":"*", "access-control-allow-headers":"content-type,x-admin-token", "access-control-allow-methods":"GET,POST,OPTIONS"}});
}
function randomKey() {
  const a = crypto.randomUUID().replaceAll("-", "").toUpperCase();
  return "YELLOW-" + a.slice(0, 4) + "-" + a.slice(4, 8) + "-" + a.slice(8, 12);
}
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return json({ok:true});
    if (url.pathname === "/validate" && req.method === "POST") {
      const {key} = await req.json();
      if (!key) return json({valid:false});
      const record = await env.KEYS.get(key);
      if (!record) return json({valid:false, message:"KEY inválida"});
      const data = JSON.parse(record);
      if (data.revoked || (data.expiresAt && Date.now() > data.expiresAt)) return json({valid:false, message:"KEY expirada ou revogada"});
      return json({valid:true});
    }
    if (!url.pathname.startsWith("/admin/")) return json({error:"Not found"},404);
    if (!env.ADMIN_TOKEN || req.headers.get("x-admin-token") !== env.ADMIN_TOKEN) return json({error:"Unauthorized"},401);
    if (url.pathname === "/admin/generate" && req.method === "POST") {
      const {days=30} = await req.json().catch(()=>({}));
      const key = randomKey();
      const expiresAt = Date.now() + Math.max(1, Math.min(Number(days)||30, 3650))*86400000;
      await env.KEYS.put(key, JSON.stringify({revoked:false, createdAt:Date.now(), expiresAt}));
      return json({key, expiresAt});
    }
    if (url.pathname === "/admin/keys" && req.method === "GET") {
      const list = await env.KEYS.list();
      const keys = await Promise.all(list.keys.map(async k => ({key:k.name, ...(JSON.parse(await env.KEYS.get(k.name)))})));
      return json({keys});
    }
    if (url.pathname === "/admin/revoke" && req.method === "POST") {
      const {key} = await req.json();
      const value = await env.KEYS.get(key);
      if (!value) return json({error:"KEY not found"},404);
      const data = JSON.parse(value); data.revoked = true;
      await env.KEYS.put(key, JSON.stringify(data));
      return json({ok:true});
    }
    if (url.pathname === "/admin/revoke-all" && req.method === "POST") {
      const list = await env.KEYS.list();
      await Promise.all(list.keys.map(async k => {
        const data = JSON.parse(await env.KEYS.get(k.name)); data.revoked = true;
        await env.KEYS.put(k.name, JSON.stringify(data));
      }));
      return json({ok:true, revoked:list.keys.length});
    }
    return json({error:"Not found"},404);
  }
};
