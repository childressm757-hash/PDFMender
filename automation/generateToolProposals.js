const fs = require("fs");
const path = require("path");

const adminDataPath = path.join(__dirname, "..", "data", "admin", "admin-data.json");

function load() {
  return JSON.parse(fs.readFileSync(adminDataPath, "utf8"));
}
function save(data) {
  fs.writeFileSync(adminDataPath, JSON.stringify(data, null, 2));
}

const proposals = [
  { id: "merge-email", name: "Merge PDFs for Email (≤10MB)", category: "SEO_VARIANT", baseEngine: "merge", risk: "LOW", status: "PENDING" },
  { id: "merge-court", name: "Merge PDFs for Court Filing", category: "SEO_VARIANT", baseEngine: "merge", risk: "LOW", status: "PENDING" },
  { id: "merge-order", name: "Merge PDFs Without Reordering", category: "SEO_VARIANT", baseEngine: "merge", risk: "LOW", status: "PENDING" },
  { id: "merge-bookmarks", name: "Merge PDFs Preserving Bookmarks", category: "SEO_VARIANT", baseEngine: "merge", risk: "LOW", status: "PENDING" },
  { id: "merge-scanned", name: "Merge PDFs for Scanned Documents", category: "SEO_VARIANT", baseEngine: "merge", risk: "LOW", status: "PENDING" },
  { id: "merge-size-threshold", name: "Merge PDFs by File Size Threshold", category: "NEW_TOOL", baseEngine: "merge", risk: "LOW", status: "PENDING" }
];

const data = load();
data.factoryQueue = data.factoryQueue || [];

for (const p of proposals) {
  if (!data.factoryQueue.find(x => x.id === p.id)) data.factoryQueue.push(p);
}

save(data);
console.log("✅ Proposals generated/ensured.");
