// =====================================================
// PDFMender Platform Server (Render Safe)
// =====================================================

console.log("🔥 SERVER BOOTED — PDFMender Factory Platform");

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

// -----------------------------------------------------
// PORT (RENDER REQUIRED)
// -----------------------------------------------------
const PORT = process.env.PORT;
if (!PORT) {
  console.error("❌ PORT not provided by Render");
  process.exit(1);
}

// -----------------------------------------------------
// PATHS (ABSOLUTE ONLY)
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
// DATA HELPERS
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

// -----------------------------------------------------
// RESPONSE HELPERS
// -----------------------------------------------------
function send(res, status, body, type = "text/plain") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

function sendJSON(res, obj) {
  send(res, 200, JSON.stringify(obj), "application/json");
}

// -----------------------------------------------------
// SAFE FILE SERVER (NO EISDIR)
// -----------------------------------------------------
function serveFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    return send(res, 404, "Not Found");
  }

  const stat = fs.statSync(filePath);

  // 🔑 DIRECTORY HANDLING (THE FIX)
  if (stat.isDirectory()) {
    const indexFile = path.join(filePath, "index.html");
    if (!fs.existsSync(indexFile)) {
      return send(res, 404, "Directory has no index.html");
    }
    filePath = indexFile;
  }

  const ext = path.extname(filePath);
  const types = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".json": "application/json",
    ".css": "text/css"
  };

  send(res, 200, fs.readFileSync(filePath), types[ext] || "text/plain");
}

// -----------------------------------------------------
// SERVER
// -----------------------------------------------------
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsed.pathname);

  // ---------------- ADMIN ----------------
  if (pathname === "/admin") return serveFile(res, ADMIN_HTML);
  if (pathname === "/admin.js") return serveFile(res, ADMIN_JS);

  // ---------------- ADMIN API ----------------
  if (pathname === "/api/admin-data") {
    return sendJSON(res, readAdminData());
  }

  if (pathname === "/api/approve" && req.method === "POST") {
    let body = "";
    req.on("data", c => (body += c));
    req.on("end", () => {
      const { id, action } = JSON.parse(body);
      const data = readAdminData();

      const item = data.factoryQueue.find(t => t.id === id);
      if (!item) return send(res, 404, "Item not found");

      item.status = action;

      if (action === "approved") {
        const toolDir = path.join(PUBLIC_DIR, "tools", item.slug);
        fs.mkdirSync(toolDir, { recursive: true });

        fs.writeFileSync(
          path.join(toolDir, "index.html"),
          `<h1>${item.title}</h1><p>Tool is live.</p>`
        );

        data.publishedPages.push({
          title: item.title,
          url: `/tools/${item.slug}/`,
          publishedAt: new Date().toISOString()
        });
      }

      writeAdminData(data);
      sendJSON(res, { ok: true });
    });
    return;
  }

  // ---------------- TOOLS ----------------
  if (pathname.startsWith("/tools/")) {
    return serveFile(res, path.join(PUBLIC_DIR, pathname));
  }

  // ---------------- STATIC ----------------
  const staticPath = path.join(PUBLIC_DIR, pathname);
  if (staticPath.startsWith(PUBLIC_DIR) && fs.existsSync(staticPath)) {
    return serveFile(res, staticPath);
  }

  send(res, 404, "Not Found");
});

// -----------------------------------------------------
// START
// -----------------------------------------------------
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server listening on 0.0.0.0:${PORT}`);
});
