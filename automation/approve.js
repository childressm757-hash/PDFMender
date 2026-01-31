const fs = require("fs");
const path = require("path");

const ADMIN_PATH = path.join(__dirname, "..", "data", "admin", "admin-data.json");

const data = JSON.parse(fs.readFileSync(ADMIN_PATH, "utf8"));

let approved = 0;

data.factory.queue = data.factory.queue.filter(item => {
  if (item.status === "pending") {
    item.status = "approved";
    item.approved_at = new Date().toISOString();
    data.factory.published.push(item);
    approved++;
    return false;
  }
  return true;
});

fs.writeFileSync(ADMIN_PATH, JSON.stringify(data, null, 2));

console.log(`✔ Approved ${approved} tools`);
