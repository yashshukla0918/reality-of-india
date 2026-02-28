import { execSync } from "child_process";
import fs from "fs";
import path from "path";

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

function ensureCleanWorkingTree() {
  const status = execSync("git status --porcelain").toString();
  if (status.trim().length > 0) {
    console.error("❌ Working directory is not clean.");
    console.error("Commit or stash changes before releasing.");
    process.exit(1);
  }
}

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest);
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function removeAllFilesExceptGit() {
  const files = fs.readdirSync(".");
  for (let file of files) {
    if (file !== ".git") {
      fs.rmSync(file, { recursive: true, force: true });
    }
  }
}

function getVersion() {
  const pkg = JSON.parse(fs.readFileSync("package.json"));
  return pkg.version;
}

try {
  ensureCleanWorkingTree();

  console.log("🔹 Building production...");
  run("npm run build");

  const version = getVersion();
  const branch = `v${version}`;

  console.log(`🔹 Creating release branch ${branch}...`);

  run(`git checkout --orphan ${branch}`);

  removeAllFilesExceptGit();

  copyDir("dist", ".");

  run("git add -A");

  run(`git commit -m "Release ${branch}"`);

  run(`git push origin ${branch}`);

  console.log("🔹 Returning to main branch...");

  run("git checkout main");

  console.log("🔹 Cleaning working directory...");
  run("git clean -fd");

  console.log(`✅ Release ${branch} created successfully.`);
} catch (err) {
  console.error("❌ Release failed:", err);
  process.exit(1);
}