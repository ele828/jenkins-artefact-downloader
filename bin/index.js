#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const util = require("util");
const https = require("https");
const download = require("download");
const filesize = require("filesize");
const decompress = require("decompress");
const commandLineArgs = require("command-line-args");
const config = require(path.join(process.cwd(), "config.js"));

const optionDefinitions = [
  { name: "job", type: String },
  { name: "brand", type: String },
  { name: "build", type: Number }
];
const options = commandLineArgs(optionDefinitions);
const { job, brand, build } = options;

if (!job || !brand || !build) {
  console.log("Usage: jad --job master --brand rc --build 310");
  process.exit(1);
}
const { username, password } = config;

const jobNames = {
  master: "google-office-dev-build-deploy",
  google_pr: "google-office-pr-m",
  google_hotfix: "google-regression-hotfix-build",
  office_hotfix: "office-regression-hotfix-build"
};

const stream = process.stdout;
const artefactFileName = `${brand}-${job}-${build}.zip`;
const out = fs.createWriteStream(artefactFileName);
let fileSize = 0;

const artefactUrl = getArtefactUrl({
  job: jobNames[job] || job,
  build: build,
  brand: brand
});
console.log("Retrieving artefact from:", artefactUrl);

const auth =
  "Basic " + new Buffer(username + ":" + password).toString("base64");
download(artefactUrl, {
  agent: https.Agent({ rejectUnauthorized: false, keepAlive: true })
})
  .on("response", res => {
    fileSize = 0;
    res.on("data", data => {
      out.write(data);
      fileSize += data.length;
      const display = formatProgressDisplay({
        totalSize: fileSize
      });
      stream.cursorTo(0);
      stream.write(display);
      stream.clearLine(1);
    });
  })
  .then(() => {
    out.end();
    decompress(artefactFileName, "./rc").then(files => {
      console.log("Done!");
    });
  })
  .catch(err => {
    console.error("error", err);
  });

function getArtefactUrl({ job, build, brand }) {
  const url = util.format(config.url, job, build, brand);
  return url;
}
function formatProgressDisplay({ totalSize }) {
  return `Downloaded: ${filesize(totalSize)}`;
}
