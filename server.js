console.log("🔥 SERVER.JS VERSION: FACTORY-PERSIST-TEST");
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

// SINGLE SOURCE OF TRUTH
const ADMIN_DATA_PATH = path.join(__dirname, "data", "admin", "admin-data.json");
const ADMIN_HTML_PATH = path.join(__dirname, "data", "admin", "index.html");
const PUBLIC_DIR = path.join(__dirname, "public");

// ---------- Helpers ----------
function readAdminData() {
  return JSON.parse(fs.readFileSync(ADMIN_DATA_PATH, "utf8"));
}

function writeAdminData(data) {
  fs.writeFileSync(ADMIN_DATA_PATH, JSON.stringify(data, null, 2));
}

function serveFile(res, filePath, contentType = "text/html") {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  res.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(filePath).pipe(res);
}

// ---------- Server ----------
const server = http.createServer((req, res) => {
  // HOME
  if (req.method === "GET" && req.url === "/") {
    return serveFile(res, path.join(PUBLIC_DIR, "index.html"));
  }

  // ADMIN UI
  if (req.method === "GET" && req.url === "/admin") {
    return serveFile(res, ADMIN_HTML_PATH);
  }

  // ADMIN DATA (READ)
  if (req.method === "GET" && req.url === "/admin-data.json") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(fs.readFileSync(ADMIN_DATA_PATH));
    return;
  }

  // ADMIN ACTIONS (WRITE)
  if (req.method === "POST" && req.url === "/admin/action") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      const { id, action } = JSON.parse(body || "{}");

      const data = readAdminData();
      const item = data.factoryQueue.find(x => x.id === id);

      if (!item) {
        res.writeHead(404);
        res.end("Item not found");
        return;
      }

      if (action === "approve") item.status = "APPROVED";
      if (action === "reject") item.status = "REJECTED";
      if (action === "defer") item.status = "DEFERRED";

      writeAdminData(data);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, id, status: item.status }));
    });
    return;
  }

  // STATIC FILES (PUBLIC)
  if (req.method === "GET") {
    const reqPath = req.url === "/" ? "/index.html" : req.url;
    const filePath = path.join(PUBLIC_DIR, reqPath);

    if (filePath.startsWith(PUBLIC_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const types = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "application/javascript",
        ".json": "application/json",
        ".txt": "text/plain"
      };
      return serveFile(res, filePath, types[ext] || "application/octet-stream");
    }
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
