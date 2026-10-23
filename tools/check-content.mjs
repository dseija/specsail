import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
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
for (const term of ["Navigate by spec. Deliver with confidence.", "The **Captain is always human**", "--adapter opencode", "specsail update", ...Object.values(roles).flat()]) {
  if (!readme.includes(term)) fail(`README.md must document: ${term}`);
}

const templateFiles = await readdir(path.join(root, "templates/specs/_templates"));
for (const name of ["request.md", "spec.md", "plan.md", "tasks.md"]) {
  if (!templateFiles.includes(name)) fail(`missing feature scaffold template templates/specs/_templates/${name}`);
}

const methodologyDocs = ["workflow.md", "runbook.md"];
for (const name of methodologyDocs) {
  try {
    await readFile(path.join(root, "docs", name), "utf8");
  } catch {
    fail(`missing canonical methodology doc docs/${name}`);
  }
  if (existsSync(path.join(root, "templates/.specsail/docs", name))) {
    fail(`templates/.specsail/docs/${name} duplicates docs/${name}; keep a single source`);
  }
}

const templateAgents = await readFile(path.join(root, "templates/.specsail/AGENTS.md"), "utf8");
if (!templateAgents.includes(".specsail/skills/manage/SKILL.md")) {
  fail("the installed AGENTS.md must trigger the conversational workflow via the manage skill");
}
const cliSource = await readFile(path.join(root, "src/cli.js"), "utf8");
if (!cliSource.includes("skills/manage/SKILL.md")) {
  fail("specsail init must add the conversational workflow trigger to AGENTS.md");
}
if (!cliSource.includes("specsail update")) {
  fail("the CLI must document specsail update in its help output");
}

const adapterRoot = path.join(root, "templates/adapters/opencode");
const adapterAgents = ["first-mate", "scout", "navigator", "quartermaster", "hands", "bosun", "clerk"];
const adapterContents = new Map();
for (const name of adapterAgents) {
  const agentPath = path.join(adapterRoot, ".opencode/agents/specsail", `${name}.md`);
  try {
    adapterContents.set(name, await readFile(agentPath, "utf8"));
  } catch {
    fail(`missing OpenCode adapter agent ${path.relative(root, agentPath)}`);
  }
}
for (const [name, agent] of adapterContents) {
  if (!/^mode: (primary|subagent)$/m.test(agent)) fail(`adapter agent ${name}.md must declare a mode`);
  if (!/^model: \S+$/m.test(agent)) fail(`adapter agent ${name}.md must declare a model`);
  if (!/^permissions:$/m.test(agent)) fail(`adapter agent ${name}.md must declare permissions`);
}
if (adapterContents.has("first-mate") && !/^mode: primary$/m.test(adapterContents.get("first-mate"))) {
  fail("the OpenCode First Mate must be a primary agent");
}
for (const name of adapterAgents.slice(1)) {
  const agent = adapterContents.get(name);
  if (agent && !/^mode: subagent$/m.test(agent)) fail(`the OpenCode ${name} agent must be a subagent`);
}

const adapterReadme = await readFile(path.join(adapterRoot, ".specsail/adapters/opencode/README.md"), "utf8");
for (const term of ["AGENT_MODEL_", "Default model chains", "different model family"]) {
  if (!adapterReadme.includes(term)) fail(`the OpenCode adapter guide must document: ${term}`);
}

const firstMateAgent = adapterContents.get("first-mate");
if (firstMateAgent && !/resource:\s*["']specsail\/\*["']/.test(firstMateAgent)) {
  fail("the OpenCode First Mate must allow only specsail/* subagents");
}
const smokeScript = await readFile(path.join(root, "tools/smoke-opencode.sh"), "utf8").catch(() => "");
if (!smokeScript.startsWith("#!/usr/bin/env bash")) fail("tools/smoke-opencode.sh must be a Bash script");
if (!smokeScript.includes("set -euo pipefail")) fail("tools/smoke-opencode.sh must fail fast");

const agentsEnvExample = await readFile(path.join(root, "templates/.specsail/agents.env.example"), "utf8");
for (const stage of Object.keys(roles)) {
  const variable = `AGENT_MODEL_${stage.toUpperCase().replaceAll("-", "_")}`;
  if (!agentsEnvExample.includes(variable)) fail(`templates/.specsail/agents.env.example must define ${variable}`);
}

const manageSkill = await readFile(path.join(root, "skills/manage/SKILL.md"), "utf8");
for (const term of ["Isolation and models", "AGENT_MODEL_", "Handoff contract", "Stage runs"]) {
  if (!manageSkill.includes(term)) fail(`manage/SKILL.md must document the isolation protocol (${term})`);
}

const tasksTemplate = await readFile(path.join(root, "templates/specs/_templates/tasks.md"), "utf8");
if (!tasksTemplate.includes("## Stage runs")) fail("tasks.md template must include a Stage runs table for per-stage model records");
const reviewTemplate = await readFile(path.join(root, "templates/specs/_templates/review.md"), "utf8");
for (const term of ["Model:", "Run:"]) {
  if (!reviewTemplate.includes(term)) fail(`review.md template must record the reviewer's ${term} line`);
}
const runbook = await readFile(path.join(root, "docs/runbook.md"), "utf8");
if (!runbook.includes("## Where am I?")) fail("runbook must include the Where am I? table referenced by manage/SKILL.md");

const releaseWorkflow = await readFile(path.join(root, ".github/workflows/release.yml"), "utf8");
if (!/^\s*id-token:\s*write$/m.test(releaseWorkflow)) fail("release workflow must request the GitHub OIDC token (id-token: write)");
if (!/^\s*contents:\s*write$/m.test(releaseWorkflow)) fail("release workflow must be allowed to create the GitHub release (contents: write)");
if (!/tags:\s*\["v\*"\]/.test(releaseWorkflow)) fail("release workflow must run on v* tags");
if (!releaseWorkflow.includes("--provenance")) fail("release workflow must publish with --provenance");
if (releaseWorkflow.includes("environment: npm") === false) fail("release workflow must use the npm environment configured as the trusted publisher");
if (/NODE_AUTH_TOKEN|NPM_TOKEN|secrets\./.test(releaseWorkflow)) fail("release workflow must not use npm tokens or repository secrets");

if (errors) process.exitCode = 1;
else console.log("✓ content, crew metadata, and package invariants are valid");
