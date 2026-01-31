const fs = require("fs");
const path = require("path");

// ABSOLUTE, UNBREAKABLE PATH
const ADMIN_DATA_PATH = path.join(
  __dirname,
  "..",
  "data",
  "admin",
  "admin-data.json"
);

console.log("🔍 Looking for admin data at:", ADMIN_DATA_PATH);

if (!fs.existsSync(ADMIN_DATA_PATH)) {
  console.error("❌ admin-data.json not found");
  process.exit(1);
}

const adminData = JSON.parse(
  fs.readFileSync(ADMIN_DATA_PATH, "utf8")
);

// Example: approve all pending proposals
let changed = false;

adminData.factory = adminData.factory || {};
adminData.factory.queue = adminData.factory.queue || [];

adminData.factory.queue.forEach(item => {
  if (item.status === "pending") {
    item.status = "approved";
    item.approved_at = new Date().toISOString();
    changed = true;
  }
});

if (!changed) {
  console.log("ℹ️ No pending items to approve.");
  process.exit(0);
}

fs.writeFileSync(
  ADMIN_DATA_PATH,
  JSON.stringify(adminData, null, 2)
);

console.log("✅ Approval complete. admin-data.json updated.");
