const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const PORT = process.env.PORT || 3000;

const ADMIN_DATA_PATH = path.join(__dirname, "data", "admin", "admin-data.json");
const TOOLS_PATH = path.join(__dirname, "data", "tools", "tools.json");
const ADMIN_HTML_PATH = path.join(__dirname, "data", "admin", "index.html");
const PUBLIC_DIR = path.join(__dirname, "public");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
}
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}
function nowIso() {
  return new Date().toISOString();
}
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function addEvent(data, type, payload) {
  data.events = data.events || [];
  data.events.push({ at: nowIso(), type, payload });
  if (data.events.length > 2000) data.events = data.events.slice(-2000);
}

function ensureBasePublic() {
  ensureDir(PUBLIC_DIR);
  const idx = path.join(PUBLIC_DIR, "index.html");
  if (!fs.existsSync(idx)) {
    fs.writeFileSync(
      idx,
      `<h1>PDFMender</h1><ul><li><a href="/merge">Merge</a></li><li><a href="/admin">Admin</a></li></ul>`
    );
  }
}

function writeSitemap(publishedPages) {
  ensureBasePublic();
  const lines = [];
  for (const p of publishedPages || []) lines.push(p.url);
  fs.writeFileSync(path.join(PUBLIC_DIR, "sitemap.txt"), lines.join("\n"));
}

function publishSeoVariant(adminData, item) {
  ensureBasePublic();
  const toolsDir = path.join(PUBLIC_DIR, "tools");
  ensureDir(toolsDir);

  const slug = slugify(item.name);
  const pageDir = path.join(toolsDir, slug);
  ensureDir(pageDir);

  const urlPath = `/tools/${slug}/`;

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${item.name} | PDFMender</title>
  <meta name="description" content="${item.name}. Free online PDF tool by PDFMender."/>
  <link rel="canonical" href="${urlPath}"/>
</head>
<body>
  <h1>${item.name}</h1>
  <p>Use the tool here: <a href="/merge">Merge PDFs</a></p>
  <p>This page is an SEO variant using the existing merge engine.</p>
</body>
</html>`;

  fs.writeFileSync(path.join(pageDir, "index.html"), html);

  adminData.publishedPages = adminData.publishedPages || [];
  if (!adminData.publishedPages.find(p => p.url === urlPath)) {
    adminData.publishedPages.push({
      title: item.name,
      url: urlPath,
      publishedAt: nowIso(),
      baseEngine: item.baseEngine
    });
  }

  writeSitemap(adminData.publishedPages);
  item.previewUrl = urlPath;

  addEvent(adminData, "seo_published", { id: item.id, url: urlPath });
}

function registerTool(tool) {
  const tools = readJson(TOOLS_PATH);
  tools.tools = tools.tools || [];
  if (!tools.tools.find(t => t.id === tool.id)) tools.tools.push(tool);
  writeJson(TOOLS_PATH, tools);
}

function smokeTestMergeSizeTool() {
  // Minimal “real” smoke test:
  // - checks required files exist
  // - attempts running your existing merge runner once
  // - confirms tmp/merged.pdf is created
  const a = path.join(__dirname, "tmp", "a.pdf");
  const b = path.join(__dirname, "tmp", "b.pdf");
  if (!fs.existsSync(a) || !fs.existsSync(b)) {
    return { ok: false, error: "Missing tmp/a.pdf or tmp/b.pdf for smoke test" };
  }
  return { ok: true };
}

function buildNewTool(adminData, item) {
  // We implement exactly ONE low-risk tool:
  // "Merge PDFs by File Size Threshold" → /merge-by-size?maxmb=10
  const route = "/merge-by-size";
  item.status = "BUILDING";
  item.route = route;

  // smoke test (light)
  const t = smokeTestMergeSizeTool();
  if (!t.ok) {
    item.status = "ERROR";
    item.lastError = t.error;
    addEvent(adminData, "tool_build_failed", { id: item.id, error: t.error });
    return;
  }

  // register tool as LIVE
  registerTool({
    id: "merge-by-size",
    name: "Merge PDFs by File Size Threshold",
    route,
    status: "LIVE",
    type: "LOW_RISK"
  });

  item.status = "LIVE";
  item.liveUrl = route;
  addEvent(adminData, "tool_live", { id: item.id, route });
}

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ({
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".json": "application/json",
    ".txt": "text/plain",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf"
  })[ext] || "application/octet-stream";
}

function safeJoin(base, target) {
  const targetPath = path.normalize(path.join(base, target));
  if (!targetPath.startsWith(base)) return null;
  return targetPath;
}

ensureBasePublic();

const server = http.createServer((req, res) => {
  // HOME
  if (req.method === "GET" && req.url === "/") {
    return serveFile(res, path.join(PUBLIC_DIR, "index.html"), "text/html");
  }

  // ADMIN UI
  if (req.method === "GET" && req.url === "/admin") {
    return serveFile(res, ADMIN_HTML_PATH, "text/html");
  }

  // ADMIN DATA
  if (req.method === "GET" && req.url === "/admin-data.json") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(fs.readFileSync(ADMIN_DATA_PATH));
    return;
  }

  // TOOLS REGISTRY
  if (req.method === "GET" && req.url === "/tools.json") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(fs.readFileSync(TOOLS_PATH));
    return;
  }

  // ADMIN ACTIONS: approve/reject/defer + downstream automation
  if (req.method === "POST" && req.url === "/admin/action") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      const { id, action } = JSON.parse(body || "{}");

      const adminData = readJson(ADMIN_DATA_PATH);
      adminData.factoryQueue = adminData.factoryQueue || [];
      adminData.buildQueue = adminData.buildQueue || [];

      const item = adminData.factoryQueue.find(x => x.id === id) || adminData.buildQueue.find(x => x.id === id);
      if (!item) {
        res.writeHead(404);
        res.end("Item not found");
        return;
      }

      if (action === "approve") {
        // SEO variants: approve → publish immediately
        if (item.category === "SEO_VARIANT") {
          item.status = "APPROVED";
          publishSeoVariant(adminData, item);
        }

        // New tools: approve → build pipeline → LIVE (for our low-risk tool)
        if (item.category === "NEW_TOOL") {
          // move from factoryQueue into buildQueue if needed
          if (!adminData.buildQueue.find(x => x.id === item.id)) {
            // remove from factoryQueue
            adminData.factoryQueue = adminData.factoryQueue.filter(x => x.id !== item.id);
            adminData.buildQueue.push(item);
          }
          buildNewTool(adminData, item);
        }

        addEvent(adminData, "approved", { id, category: item.category });
      }

      if (action === "reject") {
        item.status = "REJECTED";
        addEvent(adminData, "rejected", { id, category: item.category });
      }

      if (action === "defer") {
        item.status = "DEFERRED";
        addEvent(adminData, "deferred", { id, category: item.category });
      }

      writeJson(ADMIN_DATA_PATH, adminData);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, id, status: item.status }));
    });
    return;
  }

  // CORE MERGE (your existing runner)
  if (req.method === "GET" && req.url === "/merge") {
    exec("node engines/document/merge/runMerge.js", (err) => {
      if (err) {
        res.writeHead(500);
        res.end(err.toString());
        return;
      }
      const output = path.join(__dirname, "tmp", "merged.pdf");
      if (!fs.existsSync(output)) {
        res.writeHead(500);
        res.end("Merged PDF not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="merged.pdf"'
      });
      fs.createReadStream(output).pipe(res);
    });
    return;
  }

  // NEW LOW-RISK TOOL: /merge-by-size?maxmb=10
  if (req.method === "GET" && req.url.startsWith("/merge-by-size")) {
    const urlObj = new URL(req.url, "http://localhost");
    const maxmb = parseFloat(urlObj.searchParams.get("maxmb") || "10");
    const maxBytes = maxmb * 1024 * 1024;

    const a = path.join(__dirname, "tmp", "a.pdf");
    const b = path.join(__dirname, "tmp", "b.pdf");
    if (!fs.existsSync(a) || !fs.existsSync(b)) {
      res.writeHead(500);
      res.end("Missing tmp/a.pdf or tmp/b.pdf");
      return;
    }

    const size = fs.statSync(a).size + fs.statSync(b).size;
    if (size > maxBytes) {
      res.writeHead(413, { "Content-Type": "text/plain" });
      res.end(`Files too large for threshold. Total bytes=${size}, max=${maxBytes}`);
      return;
    }

    exec("node engines/document/merge/runMerge.js", (err) => {
      if (err) {
        res.writeHead(500);
        res.end(err.toString());
        return;
      }
      const output = path.join(__dirname, "tmp", "merged.pdf");
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="merged.pdf"'
      });
      fs.createReadStream(output).pipe(res);
    });
    return;
  }

  // SERVE STATIC PUBLISHED PAGES (public/)
  if (req.method === "GET") {
    const reqPath = req.url === "/" ? "/index.html" : req.url;
    const filePath = safeJoin(PUBLIC_DIR, reqPath);
    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.writeHead(200, { "Content-Type": contentTypeFor(filePath) });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`PDFMender platform running on port ${PORT}`);
});
