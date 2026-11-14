module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const configured = process.env.KEY_SERVICE_URL || "";
  if (!configured) return res.status(200).json({ serviceUrl: null });

  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" || url.username || url.password) {
      return res.status(200).json({ serviceUrl: null });
    }
    const serviceUrl = url.origin + url.pathname.replace(/\/+$/, "");
    return res.status(200).json({ serviceUrl });
  } catch {
    return res.status(200).json({ serviceUrl: null });
  }
};
