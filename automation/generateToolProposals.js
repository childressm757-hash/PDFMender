const fs = require("fs");
const path = require("path");

const ADMIN_PATH = path.join(__dirname, "..", "data", "admin", "admin-data.json");

const tools = [
  {
    id: "merge-email-10mb",
    title: "Merge PDFs for Email (≤10MB)",
    engine: "merge",
    route: "/tools/merge-pdfs-for-email-10mb/"
  },
  {
    id: "merge-court",
    title: "Merge PDFs for Court Filing",
    engine: "merge",
    route: "/tools/merge-pdfs-for-court/"
  }
];

const data = JSON.parse(fs.readFileSync(ADMIN_PATH, "utf8"));

tools.forEach(t => {
  if (!data.factory.queue.find(x => x.id === t.id) &&
      !data.factory.published.find(x => x.id === t.id)) {
    data.factory.queue.push({
      ...t,
      status: "pending",
      created_at: new Date().toISOString()
    });
  }
});

fs.writeFileSync(ADMIN_PATH, JSON.stringify(data, null, 2));
console.log("✔ Proposals generated");
