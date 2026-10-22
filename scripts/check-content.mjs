import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const roles = {
  manage: ["Orchestrator", "First Mate"],
  understand: ["Product Owner", "Scout"],
  plan: ["Tech Lead", "Navigator"],
  "acceptance-tests": ["QA", "Quartermaster"],
  implement: ["Developer", "Hands"],
  review: ["Reviewer", "Bosun"],
  ship: ["Release", "Clerk"],
};

let errors = 0;
function fail(message) {
  console.error(`✗ ${message}`);
  errors += 1;
}

const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (manifest.name !== "specsail") fail("package name must be specsail");
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) fail("package version must be a stable x.y.z version");
if (manifest.engines?.node !== ">=20") fail("package must declare Node.js >=20");
if (manifest.bin?.specsail !== "bin/specsail.js") fail("the specsail binary path must use the normalized bin/specsail.js form");
if (Object.keys(manifest.dependencies ?? {}).length > 0) fail("the CLI should not add runtime dependencies");

for (const [stage, [title, crew]] of Object.entries(roles)) {
  const skillPath = path.join(root, "skills", stage, "SKILL.md");
  let content;
  try {
    content = await readFile(skillPath, "utf8");
  } catch {
    fail(`missing skill ${path.relative(root, skillPath)}`);
    continue;
  }
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatter) {
    fail(`${stage}/SKILL.md is missing YAML frontmatter`);
    continue;
  }
  const fields = frontmatter[1];
  if (!new RegExp(`^name: ${stage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m").test(fields)) {
    fail(`${stage}/SKILL.md name must match its directory`);
  }
  if (!fields.includes(`specsail-title: ${title}`)) fail(`${stage}/SKILL.md must identify the ${title} role`);
  if (!fields.includes(`specsail-crew: ${crew}`)) fail(`${stage}/SKILL.md must identify the ${crew} crew alias`);
  if (!content.includes(`${title} — ${crew}`)) fail(`${stage}/SKILL.md heading must show ${title} — ${crew}`);
}

const readme = await readFile(path.join(root, "README.md"), "utf8");
for (const term of ["Navigate by spec. Deliver with confidence.", "The **Captain is always human**", ...Object.values(roles).flat()]) {
  if (!readme.includes(term)) fail(`README.md must document: ${term}`);
}

const templateFiles = await readdir(path.join(root, "specs/_templates"));
for (const name of ["request.md", "spec.md", "plan.md", "tasks.md"]) {
  if (!templateFiles.includes(name)) fail(`missing feature scaffold template specs/_templates/${name}`);
}

const templateAgents = await readFile(path.join(root, "templates/.specsail/AGENTS.md"), "utf8");
if (!templateAgents.includes(".specsail/skills/manage/SKILL.md")) {
  fail("the installed AGENTS.md must trigger the conversational workflow via the manage skill");
}
const cliSource = await readFile(path.join(root, "src/cli.js"), "utf8");
if (!cliSource.includes("skills/manage/SKILL.md")) {
  fail("specsail init must add the conversational workflow trigger to AGENTS.md");
}

if (errors) process.exitCode = 1;
else console.log("✓ content, crew metadata, and package invariants are valid");
