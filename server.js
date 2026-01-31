const http = require("http");
const fs = require("fs");
const path = require("path");
const multiparty = require("multiparty");

const tools = require("./tools.json");
const kernel = require("./kernel/document");

const PORT = process.env.PORT || 10000;
const TMP_DIR = path.join(__dirname, "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

http.createServer((req, res) => {

  // Serve tools.json
  if (req.url === "/tools.json") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(tools));
    return;
  }

  // Tool UI
  if (req.method === "GET" && req.url.startsWith("/tools/")) {
    res.setHeader("Content-Type", "text/html");
    res.end(fs.readFileSync("public/tool.html"));
    return;
  }

  // Tool execution
  if (req.method === "POST" && req.url.startsWith("/tools/")) {
    const slug = req.url.split("/").pop();
    const tool = tools[slug];
    if (!tool) {
      res.statusCode = 404;
      return res.end("Unknown tool");
    }

    const form = new multiparty.Form({ uploadDir: TMP_DIR });
    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = 500;
        return res.end(err.toString());
      }

      const paths = files.files.map(f => f.path);
      const output = kernel[tool.engine](paths);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=output.pdf");
      fs.createReadStream(output).pipe(res);
    });
    return;
  }

  res.end("PDFMender running");

}).listen(PORT, () => {
  console.log("PDFMender live on", PORT);
});
