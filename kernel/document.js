const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const TMP_DIR = path.join(__dirname, "..", "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

function merge(files) {
  const output = path.join(TMP_DIR, "output.pdf");
  const inputs = files.map(f => `"${f}"`).join(" ");
  execSync(`python engines/document/merge/merge.py ${inputs} "${output}"`);
  return output;
}

function reorder(files) {
  return merge(files);
}

function split(files) {
  return merge(files);
}

function compress(files) {
  return merge(files);
}

module.exports = {
  merge,
  reorder,
  split,
  compress
};
