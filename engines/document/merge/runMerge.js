const { spawn } = require("child_process");
const path = require("path");

module.exports = function runMerge(inputs, outputPath) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "merge.py");

    const args = [
      scriptPath,
      ...inputs,
      outputPath
    ];

    const proc = spawn("python3", args);

    proc.stderr.on("data", (data) => {
      reject(data.toString());
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(`Merge failed with exit code ${code}`);
      }
    });
  });
};
