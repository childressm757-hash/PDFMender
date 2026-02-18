const http = require("http");
const fs = require("fs");
const path = require("path");
const multiparty = require("multiparty");

const kernel = require("./kernel/document");

const PORT = process.env.PORT || 10000;
const TMP_DIR = path.join(__dirname, "tmp");

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

function loadTools() {
  const toolsPath = path.join(__dirname, "tools.json");
  const raw = fs.readFileSync(toolsPath, "utf8");
  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed.tools) ? parsed.tools : [];
  return { parsed, list };
}

http.createServer((req, res) => {

  // =========================
  // HEALTH CHECK
  // =========================
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  // =========================
  // STATIC FILES (public/)
  // =========================
  if (req.method === "GET") {
    const filePath = path.join(__dirname, "public", req.url);

    // Prevent directory traversal
    if (filePath.startsWith(path.join(__dirname, "public")) &&
        fs.existsSync(filePath) &&
        fs.statSync(filePath).isFile()) {

      const ext = path.extname(filePath).toLowerCase();
      const contentTypes = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "application/javascript",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml"
      };

      res.writeHead(200, {
        "Content-Type": contentTypes[ext] || "application/octet-stream"
      });

      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  // =========================
  // SERVE tools.json
  // =========================
  if (req.method === "GET" && req.url === "/tools.json") {
    const { parsed } = loadTools();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(parsed));
    return;
  }

  // =========================
  // UNIVERSAL TOOL PAGE
  // =========================
  if (req.method === "GET" && req.url.startsWith("/tools/")) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      fs.readFileSync(path.join(__dirname, "public", "tool.html"))
    );
    return;
  }

  // =========================
  // RUN TOOL
  // =========================
  if (req.method === "POST" && req.url.startsWith("/tools/")) {

    const slug = req.url.split("/").filter(Boolean).pop();
    const { list } = loadTools();
    const tool = list.find(t => t.id === slug && t.enabled);

    if (!tool) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Unknown tool");
      return;
    }

    const form = new multiparty.Form({ uploadDir: TMP_DIR });

    form.parse(req, (err, fields, files) => {

      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Upload parse error: " + err.toString());
        return;
      }

      const uploaded = (files.files || []).map(f => f.path);

      try {
        const outputPath = kernel[tool.engine](uploaded);

        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${tool.engine}-output.pdf"`
        });

        fs.createReadStream(outputPath).pipe(res);

      } catch (e) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Tool error: " + (e && e.message ? e.message : String(e)));
      }
    });

    return;
  }

  // =========================
  // ROOT / FALLBACK
  // =========================
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("PDFMender running");

}).listen(PORT, () => {
  console.log("PDFMender live on", PORT);
});
