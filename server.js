const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

// =======================
// BASIC ADMIN AUTH
// =======================
const ADMIN_USER = "admin";
const ADMIN_PASS = "changeme";

function unauthorized(res) {
  res.writeHead(401, {
    "WWW-Authenticate": 'Basic realm="PDFMender Admin"',
  });
  res.end("Unauthorized");
}

function checkAuth(req, res) {
  const auth = req.headers.authorization;
  if (!auth) return unauthorized(res);

  const encoded = auth.split(" ")[1];
  const decoded = Buffer.from(encoded, "base64").toString();
  const [user, pass] = decoded.split(":");

  if (user !== ADMIN_USER || pass !== ADMIN_PASS) {
    return unauthorized(res);
  }
  return true;
}

// =======================
// SERVER
// =======================
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
      'python engines/document/merge/merge.py tmp/a.pdf tmp/b.pdf tmp/merged.pdf';

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
  // ADMIN PANEL
  // =======================
  if (req.url === "/admin") {
    if (!checkAuth(req, res)) return;

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
      res.writeHead(500);
      res.end("Admin UI not found.");
      return;
    }

    const html = fs.readFileSync(adminPath);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
    return;
  }

  // =======================
  // FALLBACK
  // =======================
  res.writeHead(404);
  res.end("Not Found");
});

// =======================
// START
// =======================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Platform server running on port ${PORT}`);
});
