const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {

  // HOME
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<h1>PDFMender Platform</h1><a href="/admin">Admin</a>`);
    return;
  }

  // ADMIN UI
  if (req.url === "/admin") {
    const adminHtml = path.join(__dirname, "data", "admin", "index.html");
    fs.readFile(adminHtml, "utf8", (err, html) => {
      if (err) {
        res.writeHead(500);
        res.end("Admin UI missing");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
    });
    return;
  }

  // ADMIN DATA
  if (req.url === "/admin-data.json") {
    const jsonPath = path.join(__dirname, "data", "admin", "admin-data.json");
    fs.readFile(jsonPath, "utf8", (err, json) => {
      if (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: "admin-data.json missing" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(json);
    });
    return;
  }

  // FALLBACK
  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
