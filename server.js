// =====================================================
// PDFMender Platform Server — FULL FILE
// =====================================================

console.log("🔥 SERVER BOOTED — PDFMender Factory Platform");

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

// -----------------------------------------------------
// REQUIRED FOR RENDER
// -----------------------------------------------------
const PORT = process.env.PORT;
if (!PORT) {
  console.error("❌ Render did not provide PORT");
  process.exit(1);
}

// -----------------------------------------------------
// ABSOLUTE PATHS (NO RELATIVE FILE ACCESS)
// -----------------------------------------------------
const BASE = __dirname;

const PUBLIC_DIR = path.join(BASE, "public");
const ADMIN_HTML = path.join(PUBLIC_DIR, "admin.html");
const ADMIN_JS = path.join(PUBLIC_DIR, "admin.js");

const ADMIN_DATA_PATH = path.join(
  BASE,
  "data",
  "admin",
  "admin-data.json"
);

// -----------------------------------------------------
// HELPERS
// -----------------------------------------------------
function readAdminData() {
  if (!fs.existsSync(ADMIN_DATA_PATH)) {
    return { factoryQueue: [], liveTools: [], publishedPages: [] };
  }
  return JSON.parse(fs.readFileSync(ADMIN_DATA_PATH, "utf8"));
}

function writeAdminData(data) {
  fs.mkdirSync(path.dirname(ADMIN_DATA_PATH), { recursive: true });
  fs.writeFileSync(ADMIN_DATA_PATH, JSON.stringify(data, null, 2));
}

function send(res, status, body, type = "text/plain") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

function sendJSON(res, obj) {
  send(res, 200, JSON.stringify(obj), "application/json");
}

function serveFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    send(res, 404, "Not Found");
    return;
  }
  const ext = path.extname(filePath);
  const types = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".json": "application/json",
    ".css": "text/css",
  };
  send(res, 200, fs.readFileSync(filePath), types[ext] || "text/plain");
}

// -----------------------------------------------------
// SERVER
// -----------------------------------------------------
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsed.pathname);

  // -------------------------------
  // ADMIN UI
  // -------------------------------
  if (pathname === "/admin") {
    return serveFile(res, ADMIN_HTML);
  }

  if (pathname === "/admin.js") {
    return serveFile(res, ADMIN_JS);
  }

  // -------------------------------
  // ADMIN DATA API
  // -------------------------------
  if (pathname === "/api/admin-data") {
    return sendJSON(res, readAdminData());
  }

  // -------------------------------
  // APPROVE / REJECT / DEFER
  // -------------------------------
  if (pathname === "/api/approve" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      const { id, action } = JSON.parse(body);
      const data = readAdminData();

      const item = data.factoryQueue.find(t => t.id === id);
      if (!item) return send(res, 404, "Item not found");

      item.status = action;

      if (action === "approved") {
        // publish page
        const toolDir = path.join(PUBLIC_DIR, "tools", item.slug);
        fs.mkdirSync(toolDir, { recursive: true });
        fs.writeFileSync(
          path.join(toolDir, "index.html"),
          `<h1>${item.title}</h1><p>Tool is live.</p>`
        );

        data.publishedPages.push({
          title: item.title,
          url: `/tools/${item.slug}/`,
          publishedAt: new Date().toISOString(),
        });
      }

      writeAdminData(data);
      sendJSON(res, { ok: true });
    });
    return;
  }

  // -------------------------------
  // TOOLS (PUBLIC)
  // -------------------------------
  if (pathname.startsWith("/tools/")) {
    const toolPath = path.join(PUBLIC_DIR, pathname);
    if (fs.existsSync(toolPath) && fs.statSync(toolPath).isDirectory()) {
      return serveFile(res, path.join(toolPath, "index.html"));
    }
    return send(res, 404, "Not Found");
  }

  // -------------------------------
  // STATIC FALLBACK
  // -------------------------------
  const staticPath = path.join(PUBLIC_DIR, pathname);
  if (staticPath.startsWith(PUBLIC_DIR) && fs.existsSync(staticPath)) {
    return serveFile(res, staticPath);
  }

  send(res, 404, "Not Found");
});

// -----------------------------------------------------
// START SERVER (RENDER SAFE)
// -----------------------------------------------------
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server listening on 0.0.0.0:${PORT}`);
});
