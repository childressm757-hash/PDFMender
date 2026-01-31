const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

const DATA_DIR = path.join(__dirname, "data");
const QUEUE_FILE = path.join(DATA_DIR, "factory-queue.json");
const PUBLISHED_FILE = path.join(DATA_DIR, "published-pages.json");

function readJSON(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/* ---------- API ---------- */

// Get factory queue
app.get("/api/factory/queue", (req, res) => {
  res.json(readJSON(QUEUE_FILE, []));
});

// Approve tool
app.post("/api/factory/approve/:id", (req, res) => {
  let queue = readJSON(QUEUE_FILE, []);
  let published = readJSON(PUBLISHED_FILE, []);

  const tool = queue.find(t => t.id === req.params.id);
  if (!tool) return res.status(404).json({ error: "Tool not found" });

  tool.status = "APPROVED";
  tool.approvedAt = new Date().toISOString();

  published.push({
    id: tool.id,
    title: tool.title,
    url: tool.url,
    engine: tool.engine,
    publishedAt: tool.approvedAt
  });

  writeJSON(QUEUE_FILE, queue);
  writeJSON(PUBLISHED_FILE, published);

  res.json({ success: true });
});

// Reject tool
app.post("/api/factory/reject/:id", (req, res) => {
  let queue = readJSON(QUEUE_FILE, []);
  const tool = queue.find(t => t.id === req.params.id);
  if (!tool) return res.status(404).json({ error: "Tool not found" });

  tool.status = "REJECTED";
  tool.rejectedAt = new Date().toISOString();

  writeJSON(QUEUE_FILE, queue);
  res.json({ success: true });
});

// Defer tool
app.post("/api/factory/defer/:id", (req, res) => {
  let queue = readJSON(QUEUE_FILE, []);
  const tool = queue.find(t => t.id === req.params.id);
  if (!tool) return res.status(404).json({ error: "Tool not found" });

  tool.status = "DEFERRED";
  writeJSON(QUEUE_FILE, queue);

  res.json({ success: true });
});

// List published pages
app.get("/api/published", (req, res) => {
  res.json(readJSON(PUBLISHED_FILE, []));
});

// Serve published tool pages (SEO URLs)
app.get("/tools/:slug", (req, res) => {
  const published = readJSON(PUBLISHED_FILE, []);
  const page = published.find(p => p.url.includes(req.params.slug));
  if (!page) return res.status(404).send("Not found");

  res.send(`
    <h1>${page.title}</h1>
    <p>Engine: ${page.engine}</p>
    <p>Status: LIVE</p>
  `);
});

app.listen(PORT, () =>
  console.log(`PDFMender running on ${PORT}`)
);
