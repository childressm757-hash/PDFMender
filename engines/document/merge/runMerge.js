const { PDFDocument } = require("pdf-lib");
const fs = require("fs");

(async () => {
  const args = process.argv.slice(2);
  const output = args.pop();

  const merged = await PDFDocument.create();

  for (const file of args) {
    const bytes = fs.readFileSync(file);
    const pdf = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(pdf, pdf.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }

  const outBytes = await merged.save();
  fs.writeFileSync(output, outBytes);
})();
