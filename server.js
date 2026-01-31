const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

const ADMIN_PATH = path.join(__dirname, "data", "admin", "admin-data.json");
const PUBLIC_DIR = path.join(__dirname, "public");

function send(res, code, body, type = "text/html") {
  res.writeHead(code, { "Content-Type": type });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.url === "/admin") {
    const data = JSON.parse(fs.readFileSync(ADMIN_PATH, "utf8"));
    const items = data.factory.queue.concat(data.factory.published);

    send(res, 200, `
      <h1>PDFMender Admin</h1>
      ${items.map(i => `
        <div>
          <b>${i.title}</b> — ${i.status}
          <form method="POST" action="/approve/${i.id}">
            <button>Approve</button>
          </form>
        </div>
      `).join("")}
    `);
    return;
  }

  if (req.method === "POST" && req.url.startsWith("/approve/")) {
    const id = req.url.split("/").pop();
    const data = JSON.parse(fs.readFileSync(ADMIN_PATH, "utf8"));

    const item = data.factory.queue.find(x => x.id === id);
    if (item) {
      item.status = "approved";
      data.factory.queue = data.factory.queue.filter(x => x.id !== id);
      data.factory.published.push(item);
      fs.writeFileSync(ADMIN_PATH, JSON.stringify(data, null, 2));
    }

    send(res, 302, "", "text/plain");
    return;
  }

  const filePath = path.join(PUBLIC_DIR, req.url === "/" ? "index.html" : req.url);
  if (fs.existsSync(filePath)) {
    send(res, 200, fs.readFileSync(filePath));
  } else {
    send(res, 404, "Not found", "text/plain");
  }
});

server.listen(PORT, () => {
  console.log("🔥 SERVER RUNNING ON", PORT);
});
