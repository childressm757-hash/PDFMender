const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const server = http.createServer((req, res) => {
  // ROOT
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("PDFMender platform running.");
    return;
  }

  // =======================
  // MERGE ENGINE
  // =======================
  if (req.url === "/merge") {
    const cmd =
      "python engines/document/merge/merge.py tmp/a.pdf tmp/b.pdf tmp/merged.pdf";

    exec(cmd, (err) => {
      if (err) {
        res.writeHead(500);
        res.end(err.toString());
        return;
      }

      const pdf = fs.readFileSync("tmp/merged.pdf");
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="merged.pdf"',
      });
      res.end(pdf);
    });
    return;
  }

  // =======================
  // PUBLIC ADMIN
  // =======================
  if (req.url === "/admin") {
    const adminPath = path.join(
      __dirname,
      "engines",
      "document",
      "merge",
      "data",
      "admin",
      "index.html"
    );

    if (!fs.existsSync(adminPath)) {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Admin is live, but no UI has been registered yet.");
      return;
    }

    const html = fs.readFileSync(adminPath);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
    return;
  }

  // FALLBACK
  res.writeHead(404);
  res.end("Not Found");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Platform server running on port ${PORT}`);
});
