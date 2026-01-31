const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const PORT = process.env.PORT || 3000;

// CHANGE THIS IF YOUR ADMIN FILES MOVE
const ADMIN_DIR = path.join(__dirname, "data", "admin");

function serveStaticFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  // ===== ADMIN ROUTES =====
  if (req.url === "/admin" || req.url === "/admin/") {
    const adminIndex = path.join(ADMIN_DIR, "index.html");
    return serveStaticFile(res, adminIndex, "text/html");
  }

  if (req.url.startsWith("/admin/")) {
    const filePath = path.join(ADMIN_DIR, req.url.replace("/admin/", ""));
    const ext = path.extname(filePath);

    const contentTypes = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".svg": "image/svg+xml"
    };

    return serveStaticFile(
      res,
      filePath,
      contentTypes[ext] || "application/octet-stream"
    );
  }

  // ===== MERGE ENGINE =====
  if (req.url === "/merge") {
    exec("node engines/document/merge/runMerge.js", (err) => {
      if (err) {
        res.writeHead(500);
        res.end(err.toString());
        return;
      }

      const merged = path.join(__dirname, "tmp", "merged.pdf");
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=merged.pdf"
      });
      fs.createReadStream(merged).pipe(res);
    });
    return;
  }

  // ===== DEFAULT =====
  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Platform server running on port ${PORT}`);
});

