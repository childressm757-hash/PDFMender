const fs = require("fs");
const path = require("path");

const adminDataPath = path.join(
  __dirname,
  "..",
  "data",
  "admin",
  "admin-data.json"
);

// Load existing admin data
const adminData = JSON.parse(fs.readFileSync(adminDataPath, "utf8"));

// Ensure factory queue exists
adminData.factoryQueue = adminData.factoryQueue || [];

// Hardcoded first batch (LOCKED CONFIG)
const proposals = [
  {
    id: "merge-email",
    name: "Merge PDFs for Email (≤10MB)",
    category: "SEO_VARIANT",
    baseEngine: "merge",
    risk: "LOW",
    status: "PENDING"
  },
  {
    id: "merge-court",
    name: "Merge PDFs for Court Filing",
    category: "SEO_VARIANT",
    baseEngine: "merge",
    risk: "LOW",
    status: "PENDING"
  },
  {
    id: "merge-order",
    name: "Merge PDFs Without Reordering",
    category: "SEO_VARIANT",
    baseEngine: "merge",
    risk: "LOW",
    status: "PENDING"
  },
  {
    id: "merge-bookmarks",
    name: "Merge PDFs Preserving Bookmarks",
    category: "SEO_VARIANT",
    baseEngine: "merge",
    risk: "LOW",
    status: "PENDING"
  },
  {
    id: "merge-scanned",
    name: "Merge PDFs for Scanned Documents",
    category: "SEO_VARIANT",
    baseEngine: "merge",
    risk: "LOW",
    status: "PENDING"
  },
  {
    id: "merge-size-threshold",
    name: "Merge PDFs by File Size Threshold",
    category: "NEW_TOOL",
    baseEngine: "merge",
    risk: "LOW",
    status: "PENDING"
  }
];

// Insert proposals if not already present
proposals.forEach(p => {
  if (!adminData.factoryQueue.find(q => q.id === p.id)) {
    adminData.factoryQueue.push(p);
  }
});

// Save back to admin data
fs.writeFileSync(
  adminDataPath,
  JSON.stringify(adminData, null, 2)
);

console.log("✅ Tool proposals generated.");
