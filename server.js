const http = require("http");
const fs = require("fs");
const path = require("path");

// Import the Python runner
const runMerge = require("./engines/document/merge/runMerge");

const server = http.createServer((req, res) => {

  // MERGE TEST ROUTE
  if (req.method === "GET" && req.url === "/merge") {
    const uploadDir = path.join(__dirname, "tmp");

    const inputs = [
      path.join(uploadDir, "a.pdf"),
      path.join(uploadDir, "b.pdf")
    ];

    const output = path.join(uploadDir, "merged.pdf");

    runMerge(inputs, output)
      .then(() => {
        const pdf = fs.readFileSync(output);
        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": "attachment; filename=merged.pdf"
        });
        res.end(pdf);
      })
      .catch(err => {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end(err.toString());
      });

    return;
  }

  // FALLBACK
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
