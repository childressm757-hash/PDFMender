console.log("🔥 SERVER.JS VERSION: SHARED-MERGE-ENGINE-V1");

const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const PORT = process.env.PORT || 10000;

const PUBLIC_DIR = path.join(__dirname, "public");
const TOOLS_DIR = path.join(PUBLIC_DIR, "tools");
const TMP_DIR = path.join(__dirname, "tmp");
const MERGE_ENGINE = path.join(__dirname, "engines", "document", "merge", "runMerge.js");

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

function serveFile(res, filePath, contentType = "text/html") {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

function parseMultipart(req, callback) {
  const boundary = req.headers["content-type"].split("boundary=")[1];
  let raw = Buffer.alloc(0);

  req.on("data", chunk => raw = Buffer.concat([raw, chunk]));
  req.on("end", () => {
    const parts = raw.toString().split("--" + boundary);
    const files = [];

    parts.forEach(part => {
      if (part.includes("Content-Disposition")) {
        const match = part.match(/filename="(.+?)"/);
        if (!match) return;

        const filename = Date.now() + "-" + match[1];
        const start = part.indexOf("\r\n\r\n") + 4;
        const content = part.slice(start, part.lastIndexOf("\r\n"));

        const filepath = path.join(TMP_DIR, filename);
        fs.writeFileSync(filepath, content, "binary");
        files.push(filepath);
      }
    });

    callback(files);
  });
}

const server = http.createServer((req, res) => {

  // -------- MERGE API --------
  if (req.method === "POST" && req.url === "/api/merge") {
    return parseMultipart(req, (files) => {
      if (files.length < 2) {
        res.writeHead(400);
        return res.end("Need at least 2 PDFs");
      }

      const output = path.join(TMP_DIR, `merged-${Date.now()}.pdf`);

      execFile("node", [MERGE_ENGINE, ...files, output], (err) => {
        if (err || !fs.existsSync(output)) {
          res.writeHead(500);
          return res.end("Merge failed");
        }

        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": "attachment; filename=merged.pdf"
        });

        fs.createReadStream(output).pipe(res);
      });
    });
  }

  // -------- ADMIN --------
  if (req.url === "/admin") {
    return serveFile(res, path.join(PUBLIC_DIR, "admin.html"));
  }

  // -------- TOOLS --------
  if (req.url.startsWith("/tools/")) {
    const toolPath = path.join(TOOLS_DIR, req.url.replace("/tools/", ""), "index.html");
    return serveFile(res, toolPath);
  }

  // -------- STATIC --------
  if (req.url === "/" || req.url === "") {
    return res.end("PDFMender is running.");
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`✅ Server listening on ${PORT}`);
});
