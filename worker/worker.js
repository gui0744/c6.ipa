const KEY_PREFIX = "key:";
const KEY_PATTERN = /^3105(?:-[A-F0-9]{4}){8}$/;

function response(data, status, request, env) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  };
  const origin = request.headers.get("Origin");
  if (origin && env.ALLOWED_ORIGIN && origin === env.ALLOWED_ORIGIN) {
    headers["access-control-allow-origin"] = env.ALLOWED_ORIGIN;
    headers["access-control-allow-methods"] = "GET, POST, OPTIONS";
    headers["access-control-allow-headers"] = "content-type, x-admin-key";
    headers["access-control-max-age"] = "86400";
    headers["vary"] = "Origin";
  }
  return new Response(JSON.stringify(data), { status, headers });
}

async function readJson(request, maxBytes = 16384) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Envie o conteúdo com Content-Type application/json.");
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw new Error("O corpo da solicitação ultrapassa o limite permitido.");
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("JSON inválido.");
  }
}

function createKey() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("").toUpperCase();
  return "3105-" + hex.match(/.{4}/g).join("-");
}

function storageKey(key) {
  return KEY_PREFIX + key;
}

async function findValidKey(env, key) {
  if (typeof key !== "string" || !KEY_PATTERN.test(key)) return null;
  const raw = await env.KEYS.get(storageKey(key));
  if (!raw) return null;
  let record;
  try {
    record = JSON.parse(raw);
  } catch {
    return null;
  }
  if (record.revoked || !Number.isFinite(record.expiresAt) || Date.now() >= record.expiresAt) return null;
  return record;
}

async function listKeys(env) {
  const result = [];
  let cursor;
  do {
    const options = { prefix: KEY_PREFIX, limit: 1000 };
    if (cursor) options.cursor = cursor;
    const page = await env.KEYS.list(options);
    for (const item of page.keys || []) {
      const raw = await env.KEYS.get(item.name);
      if (!raw) continue;
      try {
        const record = JSON.parse(raw);
        result.push({ key: item.name.slice(KEY_PREFIX.length), ...record });
      } catch {
        // Ignore malformed records rather than breaking the whole list.
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return result.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateConfig(config) {
  if (!isPlainObject(config)) return "A configuração precisa ser um objeto JSON.";
  const allowed = new Set(["appName", "message", "maintenance", "features", "theme"]);
  if (Object.keys(config).length === 0) return "A configuração não pode estar vazia.";
  if (Object.keys(config).some(key => !allowed.has(key))) return "A configuração contém propriedades não permitidas.";

  if ("appName" in config && (typeof config.appName !== "string" || config.appName.length > 60)) {
    return "appName precisa ser um texto de até 60 caracteres.";
  }
  if ("message" in config && (typeof config.message !== "string" || config.message.length > 280)) {
    return "message precisa ser um texto de até 280 caracteres.";
  }
  if ("maintenance" in config && typeof config.maintenance !== "boolean") {
    return "maintenance precisa ser booleano.";
  }
  if ("features" in config) {
    if (!isPlainObject(config.features)) return "features precisa ser um objeto.";
    const featureNames = new Set(["keyValidation", "catalog", "configUpload"]);
    if (Object.keys(config.features).some(key => !featureNames.has(key))) {
      return "features contém uma opção não permitida.";
    }
    if (Object.values(config.features).some(value => typeof value !== "boolean")) {
      return "Todas as opções de features precisam ser booleanas.";
    }
  }
  if ("theme" in config) {
    if (!isPlainObject(config.theme)) return "theme precisa ser um objeto.";
    if (Object.keys(config.theme).some(key => key !== "primaryColor")) {
      return "theme contém uma opção não permitida.";
    }
    if ("primaryColor" in config.theme &&
        (typeof config.theme.primaryColor !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(config.theme.primaryColor))) {
      return "theme.primaryColor precisa ser uma cor hexadecimal #RRGGBB.";
    }
  }
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (origin && (!env.ALLOWED_ORIGIN || origin !== env.ALLOWED_ORIGIN)) {
      return response({ error: "Origem não autorizada." }, 403, request, env);
    }

    if (request.method === "OPTIONS") {
      if (!origin || !env.ALLOWED_ORIGIN || origin !== env.ALLOWED_ORIGIN) {
        return response({ error: "Origem não autorizada." }, 403, request, env);
      }
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": env.ALLOWED_ORIGIN,
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "content-type, x-admin-key",
          "access-control-max-age": "86400",
          "vary": "Origin"
        }
      });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      const kvConfigured = Boolean(env.KEYS && typeof env.KEYS.get === "function");
      return response({ ok: true, kvConfigured, adminConfigured: Boolean(env.ADMIN_KEY) }, 200, request, env);
    }

    if (request.method === "POST" && url.pathname === "/validate") {
      if (!env.KEYS) return response({ valid: false, message: "O armazenamento de KEYs não está configurado." }, 503, request, env);
      try {
        const body = await readJson(request);
        const record = await findValidKey(env, body && body.key);
        return response(
          record ? { valid: true, expiresAt: record.expiresAt } :
            { valid: false, message: "KEY inválida, expirada ou revogada." },
          200,
          request,
          env
        );
      } catch (error) {
        return response({ error: error.message }, 400, request, env);
      }
    }

    if (request.method === "GET" && url.pathname === "/config") {
      if (!env.KEYS) return response({ config: null }, 503, request, env);
      const latestId = await env.KEYS.get("config:latest");
      if (!latestId) return response({ config: null }, 200, request, env);
      const raw = await env.KEYS.get("config:" + latestId);
      if (!raw) return response({ config: null }, 200, request, env);
      try {
        const record = JSON.parse(raw);
        return response({ config: record.config, name: record.name, uploadedAt: record.uploadedAt }, 200, request, env);
      } catch {
        return response({ config: null }, 200, request, env);
      }
    }

    if (!url.pathname.startsWith("/admin/")) {
      return response({ error: "Not found." }, 404, request, env);
    }
    if (!env.ADMIN_KEY) {
      return response({ error: "O segredo ADMIN_KEY ainda não foi configurado no Cloudflare." }, 503, request, env);
    }
    if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
      return response({ error: "Acesso administrativo não autorizado." }, 401, request, env);
    }
    if (!env.KEYS) {
      return response({ error: "O namespace KV KEYS ainda não está configurado." }, 503, request, env);
    }

    if (request.method === "POST" && url.pathname === "/admin/generate") {
      try {
        const body = await readJson(request);
        const days = body && body.days !== undefined ? body.days : 30;
        if (!Number.isInteger(days) || days < 1 || days > 30) {
          return response({ error: "A validade deve ser um número inteiro de 1 a 30 dias." }, 400, request, env);
        }
        const key = createKey();
        const createdAt = Date.now();
        const expiresAt = createdAt + days * 24 * 60 * 60 * 1000;
        await env.KEYS.put(storageKey(key), JSON.stringify({ revoked: false, createdAt, expiresAt, validityDays: days }));
        return response({ key, createdAt, expiresAt, validityDays: days }, 201, request, env);
      } catch (error) {
        return response({ error: error.message }, 400, request, env);
      }
    }

    if (request.method === "GET" && url.pathname === "/admin/keys") {
      try {
        return response({ keys: await listKeys(env) }, 200, request, env);
      } catch {
        return response({ error: "Não foi possível listar as KEYs." }, 500, request, env);
      }
    }

    if (request.method === "POST" && url.pathname === "/admin/revoke") {
      try {
        const body = await readJson(request);
        const key = typeof (body && body.key) === "string" ? body.key.trim() : "";
        if (!KEY_PATTERN.test(key)) return response({ error: "Formato de KEY inválido." }, 400, request, env);
        const storageName = storageKey(key);
        const raw = await env.KEYS.get(storageName);
        if (!raw) return response({ error: "KEY não encontrada." }, 404, request, env);
        const record = JSON.parse(raw);
        if (!record.revoked) {
          record.revoked = true;
          record.revokedAt = Date.now();
          await env.KEYS.put(storageName, JSON.stringify(record));
        }
        return response({ ok: true, key, revoked: true }, 200, request, env);
      } catch (error) {
        return response({ error: error.message || "Não foi possível revogar a KEY." }, 400, request, env);
      }
    }

    if (request.method === "POST" && url.pathname === "/admin/config-upload") {
      try {
        const body = await readJson(request, 72 * 1024);
        const name = typeof (body && body.name) === "string" ? body.name.trim() : "";
        if (!name.toLowerCase().endsWith(".json") || name.length > 100 || /[\\/]/.test(name)) {
          return response({ error: "Somente arquivos de configuração com nome .json são aceitos." }, 400, request, env);
        }
        const configError = validateConfig(body && body.config);
        if (configError) return response({ error: configError }, 400, request, env);
        const serialized = JSON.stringify(body.config);
        if (new TextEncoder().encode(serialized).byteLength > 65536) {
          return response({ error: "A configuração ultrapassa 64 KB." }, 413, request, env);
        }
        const id = crypto.randomUUID();
        const record = { id, name, uploadedAt: Date.now(), config: body.config };
        await env.KEYS.put("config:" + id, JSON.stringify(record));
        await env.KEYS.put("config:latest", id);
        return response({ ok: true, id, name, uploadedAt: record.uploadedAt }, 201, request, env);
      } catch (error) {
        return response({ error: error.message }, 400, request, env);
      }
    }

    return response({ error: "Not found." }, 404, request, env);
  }
};
