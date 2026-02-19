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

  /* =========================
     HEALTH CHECK (RENDER)
     ========================= */
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  /* =========================
     SERVE tools.json
     ========================= */
  if (req.method === "GET" && req.url === "/tools.json") {
    const { parsed } = loadTools();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(parsed));
    return;
  }

  /* =========================
     UNIVERSAL TOOL PAGE
     ========================= */
  if (req.method === "GET" && req.url.startsWith("/tools/")) {
    const filePath = path.join(__dirname, "public", "tool.html");
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(fs.readFileSync(filePath));
    return;
  }

  /* =========================
     RUN TOOL
     ========================= */
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
        if (tool.engine === "merge" && uploaded.length < 2) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Merge requires at least 2 PDFs.");
          return;
        }

        if (tool.engine === "compress" && uploaded.length !== 1) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Compress requires exactly 1 PDF.");
          return;
        }

        if (typeof kernel[tool.engine] !== "function") {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end(`Tool engine "${tool.engine}" is not implemented.`);
          return;
        }

        const outputPath = kernel[tool.engine](uploaded);

        const originalFile =
          files.files[0].originalFilename || "Document.pdf";

        const baseName = originalFile.replace(/\.pdf$/i, "");
        const today = new Date().toISOString().slice(0, 10);

        const outputFilename =
          `${baseName}_Court-Approved_${today}.pdf`;

        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${outputFilename}"`
        });

        fs.createReadStream(outputPath).pipe(res);

      } catch (e) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Tool error: " + (e && e.message ? e.message : String(e)));
      }
    });

    return;
  }

  /* =========================
     ROOT
     ========================= */
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("PDFMender running");

}).listen(PORT, () => {
  console.log("PDFMender live on", PORT);
});
