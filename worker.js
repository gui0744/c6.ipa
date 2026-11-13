function json(data, status=200) {
  return new Response(JSON.stringify(data), {status, headers: {
    "content-type":"application/json",
    "access-control-allow-origin":"*",
    "access-control-allow-headers":"content-type,x-admin-token",
    "access-control-allow-methods":"GET,POST,OPTIONS"
  }});
}
function randomKey() {
  const a = crypto.randomUUID().replaceAll("-","").toUpperCase();
  return "3105-" + a.slice(0,4) + "-" + a.slice(4,8) + "-" + a.slice(8,12);
}
async function validKey(env, key) {
  if (!key) return null;
  const record = await env.KEYS.get(key);
  if (!record) return null;
  const data = JSON.parse(record);
  if (data.revoked || !data.expiresAt || Date.now() > data.expiresAt) return null;
  return data;
}
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return json({ok:true});
    if (url.pathname === "/validate" && req.method === "POST") {
      const {key} = await req.json().catch(()=>({}));
      const data = await validKey(env,key);
      return json(data ? {valid:true,expiresAt:data.expiresAt} : {valid:false,message:"KEY inválida, expirada ou revogada"});
    }
    if (!url.pathname.startsWith("/admin/")) return json({error:"Not found"},404);
    if (!env.ADMIN_TOKEN || req.headers.get("x-admin-token") !== env.ADMIN_TOKEN)
      return json({error:"Unauthorized"},401);

    if (url.pathname === "/admin/generate" && req.method === "POST") {
      const {days=30} = await req.json().catch(()=>({}));
      const n = Number(days);
      if (!Number.isInteger(n) || n < 1 || n > 30)
        return json({error:"A validade deve ser de 1 a 30 dias."},400);
      const key = randomKey();
      const expiresAt = Date.now() + n*86400000;
      await env.KEYS.put(key, JSON.stringify({revoked:false,createdAt:Date.now(),expiresAt}));
      return json({key,expiresAt});
    }
    if (url.pathname === "/admin/keys" && req.method === "GET") {
      const list = await env.KEYS.list({prefix:"3105-"});
      const keys = await Promise.all(list.keys.map(async k => ({key:k.name,...JSON.parse(await env.KEYS.get(k.name))})));
      return json({keys});
    }
    if (url.pathname === "/admin/revoke" && req.method === "POST") {
      const {key} = await req.json().catch(()=>({}));
      const value = await env.KEYS.get(key);
      if (!value) return json({error:"KEY não encontrada"},404);
      const data=JSON.parse(value);data.revoked=true;
      await env.KEYS.put(key,JSON.stringify(data));return json({ok:true});
    }
    if (url.pathname === "/admin/revoke-all" && req.method === "POST") {
      const list=await env.KEYS.list({prefix:"3105-"});
      await Promise.all(list.keys.map(async k=>{
        const data=JSON.parse(await env.KEYS.get(k.name));data.revoked=true;
        await env.KEYS.put(k.name,JSON.stringify(data));
      }));
      return json({ok:true,revoked:list.keys.length});
    }
    if (url.pathname === "/admin/config-upload" && req.method === "POST") {
      const body=await req.json().catch(()=>null);
      if (!body || !body.config || Array.isArray(body.config) || typeof body.config!=="object")
        return json({error:"Envie um objeto JSON de configuração válido."},400);
      const serialized=JSON.stringify(body.config);
      if (new TextEncoder().encode(serialized).length>65536)
        return json({error:"A configuração ultrapassa 64 KB."},413);
      const id=crypto.randomUUID();
      const record={id,name:String(body.name||"config.json").slice(0,100),uploadedAt:Date.now(),config:body.config};
      await env.KEYS.put("config:"+id,JSON.stringify(record));
      await env.KEYS.put("config:latest",id);
      return json({ok:true,id,name:record.name,uploadedAt:record.uploadedAt});
    }
    return json({error:"Not found"},404);
  }
};