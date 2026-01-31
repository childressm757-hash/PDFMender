const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // ========= HOME =========
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <h1>PDFMender Platform</h1>
      <ul>
        <li><a href="/merge">Merge PDFs</a></li>
        <li><a href="/admin">Admin</a></li>
      </ul>
    `);
    return;
  }

  // ========= MERGE ENGINE =========
  if (req.url === "/merge") {
    exec("node engines/document/merge/runMerge.js", (err) => {
      if (err) {
        res.writeHead(500);
        res.end(err.toString());
        return;
      }

      const output = path.join(__dirname, "tmp", "merged.pdf");
      fs.readFile(output, (err, pdf) => {
        if (err) {
          res.writeHead(500);
          res.end("Merged PDF not found");
          return;
        }

        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": "attachment; filename=merged.pdf",
        });
        res.end(pdf);
      });
    });
    return;
  }

  // ========= ADMIN UI =========
  if (req.url === "/admin") {
    const adminHtml = path.join(
      __dirname,
      "data",
      "admin",
      "index.html"
    );

    fs.readFile(adminHtml, "utf8", (err, html) => {
      if (err) {
        res.writeHead(404);
        res.end("Admin UI not found");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
    });
    return;
  }

  // ========= ADMIN DATA =========
  if (req.url === "/admin-data.json") {
    const adminData = path.join(
      __dirname,
      "data",
      "admin",
      "admin-data.json"
    );

    fs.readFile(adminData, "utf8", (err, json) => {
      if (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: "Admin data missing" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(json);
    });
    return;
  }

  // ========= STATIC FILES (OPTIONAL) =========
  if (req.url.startsWith("/static/")) {
    const filePath = path.join(__dirname, req.url);
    fs.readFile(filePath, (err, file) => {
      if (err) {
        res.writeHead(404);
        res.end("File not found");
        return;
      }
      res.writeHead(200);
      res.end(file);
    });
    return;
  }

  // ========= FALLBACK =========
  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Platform server running on port ${PORT}`);
});
