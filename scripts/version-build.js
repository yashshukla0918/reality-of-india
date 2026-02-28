import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const pkg = JSON.parse(fs.readFileSync("./package.json"));
const version = pkg.version;

console.log(`Building version ${version}...`);

execSync("npm run build", { stdio: "inherit" });

const targetDir = `dist-versions/v${version}`;

if (!fs.existsSync("dist-versions"))
  fs.mkdirSync("dist-versions");

fs.rmSync(targetDir, { recursive: true, force: true });
fs.cpSync("dist", targetDir, { recursive: true });

console.log(`Saved versioned build to ${targetDir}`);