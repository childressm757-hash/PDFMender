const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const TMP_DIR = path.join(__dirname, "..", "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

function assertFiles(files, min, max, tool) {
  if (!Array.isArray(files)) {
    throw new Error(`${tool}: files must be an array`);
  }
  if (files.length < min || (max && files.length > max)) {
    throw new Error(
      `${tool}: requires ${min}${max ? "–" + max : "+"} file(s)`
    );
  }
}

/* =========================
   MERGE
   ========================= */
function merge(files) {
  assertFiles(files, 2, null, "merge");

  const output = path.join(TMP_DIR, `merged-${Date.now()}.pdf`);
  const inputs = files.map(f => `"${f}"`).join(" ");

  execSync(
    `python engines/document/merge/merge.py ${inputs} "${output}"`,
    { stdio: "inherit" }
  );

  return output;
}

/* =========================
   COMPRESS (REAL)
   ========================= */
function compress(files) {
  assertFiles(files, 1, 1, "compress");

  const input = files[0];
  const output = path.join(TMP_DIR, `compressed-${Date.now()}.pdf`);

  execSync(
    `gs -sDEVICE=pdfwrite \
-dCompatibilityLevel=1.4 \
-dPDFSETTINGS=/ebook \
-dNOPAUSE -dQUIET -dBATCH \
-sOutputFile="${output}" "${input}"`,
    { stdio: "inherit" }
  );

  return output;
}

/* =========================
   REORDER
   pages = [3,1,2] etc
   ========================= */
function reorder(files, pages) {
  assertFiles(files, 1, 1, "reorder");

  if (!Array.isArray(pages) || pages.length === 0) {
    throw new Error("reorder: pages array required");
  }

  const input = files[0];
  const output = path.join(TMP_DIR, `reordered-${Date.now()}.pdf`);
  const pageSpec = pages.join(" ");

  execSync(
    `pdftk "${input}" cat ${pageSpec} output "${output}"`,
    { stdio: "inherit" }
  );

  return output;
}

/* =========================
   SPLIT
   outputs = folder of pages
   ========================= */
function split(files) {
  assertFiles(files, 1, 1, "split");

  const input = files[0];
  const outDir = path.join(TMP_DIR, `split-${Date.now()}`);
  fs.mkdirSync(outDir, { recursive: true });

  execSync(
    `pdftk "${input}" burst output "${outDir}/page_%03d.pdf"`,
    { stdio: "inherit" }
  );

  return outDir;
}

module.exports = {
  merge,
  compress,
  reorder,
  split
};
