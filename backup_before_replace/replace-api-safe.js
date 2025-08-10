import fs from "fs";
import path from "path";

const projectDir = "./"; // folder project
const backupDir = "./backup_before_replace";
const targetFiles = [];

function scanDir(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((file) => {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      scanDir(fullPath);
    } else if (file.name.endsWith(".js") || file.name.endsWith(".html")) {
      targetFiles.push(fullPath);
    }
  });
}

function ensureBackupDir(filePath) {
  const relativePath = path.relative(projectDir, filePath);
  const backupPath = path.join(backupDir, relativePath);
  const backupFolder = path.dirname(backupPath);

  fs.mkdirSync(backupFolder, { recursive: true });
  fs.copyFileSync(filePath, backupPath);
}

function replaceInFile(filePath) {
  ensureBackupDir(filePath);

  let content = fs.readFileSync(filePath, "utf8");

  // Hapus import dari api.js
  content = content.replace(
    /import\s+\{[^}]+\}\s+from\s+['"]\.\/api\.js['"];?/g,
    ""
  );

  // Ganti semua GEMINI_API_URL jadi '/api/gemini'
  content = content.replace(/\bGEMINI_API_URL\b/g, "'/api/gemini'");

  // Hapus semua referensi GEMINI_API_KEY
  content = content.replace(/\bGEMINI_API_KEY\b/g, "''");

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Updated: ${filePath}`);
}

scanDir(projectDir);
targetFiles.forEach(replaceInFile);

console.log(
  "✅ Semua import api.js diganti ke /api/gemini (backup ada di folder backup_before_replace)"
);
