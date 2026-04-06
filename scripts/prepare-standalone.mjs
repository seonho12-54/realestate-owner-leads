import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const standaloneDir = path.join(projectRoot, ".next", "standalone");
const standaloneStaticDir = path.join(standaloneDir, ".next", "static");
const sourceStaticDir = path.join(projectRoot, ".next", "static");
const sourcePublicDir = path.join(projectRoot, "public");
const targetPublicDir = path.join(standaloneDir, "public");

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyDirectory(source, target) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.cp(source, target, {
    force: true,
    recursive: true,
  });
}

async function main() {
  if (!(await exists(standaloneDir))) {
    throw new Error("`.next/standalone` 폴더를 찾지 못했습니다. 먼저 `next build`를 실행해 주세요.");
  }

  if (await exists(sourceStaticDir)) {
    await copyDirectory(sourceStaticDir, standaloneStaticDir);
  }

  if (await exists(sourcePublicDir)) {
    await copyDirectory(sourcePublicDir, targetPublicDir);
  }

  console.log("Standalone assets prepared.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

