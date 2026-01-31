console.log("🔥 SERVER.JS VERSION: FACTORY-PERSIST-STATIC-SERVE");

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

// === DIRECTORIES ===
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const ADMIN_DIR = path.join(DATA_DIR, "admin");
const ADMIN_DATA_PATH = path.join(ADMIN_DIR, "admin-data.json");
const FACTORY_QUEUE_PATH = path.join(DATA_DIR, "factory-queue.json");

// === SAFETY ===
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(ADMIN_DIR)) fs.mkdirSync(ADMIN_DIR);
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
if (!fs.existsSync(ADMIN_DATA_PATH)) {
  fs.writeFileSync(ADMIN_DATA_PATH, JSON.stringify({ businesses: [] }, null, 2));
}
if (!fs.existsSync(FACTORY_QUEUE_PATH)) {
  fs.writeFileSync(FACTORY_QUEUE_PATH, JSON.stringify([], null, 2));
}

// === HELPERS ===
function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJSON(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function send(res, code, type, body) {
  res.writeHead(code, { "Content-Type": type });
  res.end(body);
}

// === SERVER ===
http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);

  // ---------- ADMIN API ----------
  if (url === "/admin/data") {
    return send(res, 200, "application/json", fs.readFileSync(ADMIN_DATA_PATH));
  }

  if (url.startsWith("/admin/action") && req.method === "POST") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      const { id, action } = JSON.parse(body);
      const queue = readJSON(FACTORY_QUEUE_PATH);

      const item = queue.find(q => q.id === id);
      if (!item) return send(res, 404, "text/plain", "Item not found");

      item.status = action;

      // APPROVE → publish page
      if (action === "approved") {
        const toolDir = path.join(PUBLIC_DIR, item.url);
        fs.mkdirSync(toolDir, { recursive: true });

        fs.writeFileSync(
          path.join(toolDir, "index.html"),
          `<!DOCTYPE html>
<html>
<head>
  <title>${item.title}</title>
</head>
<body>
  <h1>${item.title}</h1>
  <p>${item.description}</p>
  <form method="POST" action="/api/merge">
    <input type="file" name="files" multiple />
    <button>Merge PDFs</button>
  </form>
</body>
</html>`
        );
      }

      writeJSON(FACTORY_QUEUE_PATH, queue);
      send(res, 200, "application/json", JSON.stringify({ ok: true }));
    });
    return;
  }

  // ---------- STATIC FILES ----------
  let filePath = path.join(PUBLIC_DIR, url === "/" ? "/index.html" : url);

  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      const indexFile = path.join(filePath, "index.html");
      if (fs.existsSync(indexFile)) {
        return fs.createReadStream(indexFile).pipe(res);
      }
    }

    if (stat.isFile()) {
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  // ---------- 404 ----------
  send(res, 404, "text/plain", "Not found");
}).listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
