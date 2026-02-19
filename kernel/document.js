const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const OUTPUT_DIR = path.join(__dirname, "..", "tmp");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function merge(files) {
  const output = path.join(OUTPUT_DIR, `merged-${Date.now()}.pdf`);
  const cmd = `pdfunite ${files.map(f => `"${f}"`).join(" ")} "${output}"`;
  execSync(cmd);
  return output;
}

function compress(files) {
  const input = files[0];
  const output = path.join(OUTPUT_DIR, `compressed-${Date.now()}.pdf`);
  const cmd = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dBATCH -sOutputFile="${output}" "${input}"`;
  execSync(cmd);
  return output;
}

function flatten(files) {
  const input = files[0];
  const output = path.join(OUTPUT_DIR, `flattened-${Date.now()}.pdf`);

  // Ghostscript flatten: removes XFA + interactive fields
  const cmd = `gs -sDEVICE=pdfwrite -dNOPAUSE -dBATCH -dSAFER -dCompatibilityLevel=1.4 -sOutputFile="${output}" "${input}"`;
  execSync(cmd);

  return output;
}

module.exports = {
  merge,
  compress,
  flatten
};
