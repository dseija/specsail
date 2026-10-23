import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { runCli } from "../../src/cli.js";

const packageRoot = new URL("../../", import.meta.url).pathname;
const manifest = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));

async function temporaryProject() {
  return mkdtemp(path.join(os.tmpdir(), "specsail-test-"));
}

function streams() {
  let stdout = "";
  let stderr = "";
  return {
    options: {
      packageRoot,
      stdout: (text) => { stdout += text; },
      stderr: (text) => { stderr += text; },
    },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

test("init preserves project-owned files, installs the crew, and is repeatable", async (context) => {
  const cwd = await temporaryProject();
  context.after(() => rm(cwd, { recursive: true, force: true }));
  await mkdir(path.join(cwd, "docs"), { recursive: true });
  await writeFile(path.join(cwd, "AGENTS.md"), "# Existing project rules\n", "utf8");
  await writeFile(path.join(cwd, "Makefile"), "verify:\n\t@echo project checks\n", "utf8");
  await writeFile(path.join(cwd, "docs/project.md"), "# My existing project\n", "utf8");
  await writeFile(path.join(cwd, ".specsail.json"), JSON.stringify({ version: "old", localSetting: true }), "utf8");
  const first = streams();

  assert.equal(await runCli(["init"], { cwd, ...first.options }), 0);
  assert.equal(await readFile(path.join(cwd, "Makefile"), "utf8"), "verify:\n\t@echo project checks\n");
  assert.equal(await readFile(path.join(cwd, "docs/project.md"), "utf8"), "# My existing project\n");
  assert.match(await readFile(path.join(cwd, "AGENTS.md"), "utf8"), /<!-- specsail:start -->/);
  assert.match(await readFile(path.join(cwd, ".specsail/skills/understand/SKILL.md"), "utf8"), /Scout/);
  assert.match(await readFile(path.join(cwd, ".specsail/skills/manage/SKILL.md"), "utf8"), /First Mate/);
  assert.match(await readFile(path.join(cwd, ".specsail/skills/review/SKILL.md"), "utf8"), /Bosun/);
  assert.match(await readFile(path.join(cwd, ".specsail/skills/ship/SKILL.md"), "utf8"), /Clerk/);
  assert.match(await readFile(path.join(cwd, ".specsail/docs/workflow.md"), "utf8"), /SpecSail workflow reference/);
  assert.match(await readFile(path.join(cwd, ".specsail/docs/runbook.md"), "utf8"), /SpecSail runbook/);
  assert.match(await readFile(path.join(cwd, ".specsail/templates/specs/_templates/spec.md"), "utf8"), /Status: DRAFT/);
  assert.match(await readFile(path.join(cwd, "AGENTS.md"), "utf8"), /skills\/manage\/SKILL\.md/);
  assert.match(await readFile(path.join(cwd, ".gitignore"), "utf8"), /\.specsail\/agents\.env/);
  assert.deepEqual(JSON.parse(await readFile(path.join(cwd, ".specsail.json"), "utf8")), { version: manifest.version, localSetting: true });

  const second = streams();
  assert.equal(await runCli(["init"], { cwd, ...second.options }), 0);
  const agents = await readFile(path.join(cwd, "AGENTS.md"), "utf8");
  assert.equal(agents.split("<!-- specsail:start -->").length - 1, 1);
  assert.equal(agents.split("<!-- specsail:end -->").length - 1, 1);
  const gitignore = await readFile(path.join(cwd, ".gitignore"), "utf8");
  assert.equal(gitignore.split("# >>> SpecSail >>>").length - 1, 1);
  assert.equal(gitignore.split("# <<< SpecSail <<<").length - 1, 1);
  assert.match(second.stdout(), /left \d+ existing file\(s\) unchanged/);
});

test("new scaffolds only the four feature artifacts and rejects unsafe or duplicate slugs", async (context) => {
  const cwd = await temporaryProject();
  context.after(() => rm(cwd, { recursive: true, force: true }));
  const initStreams = streams();
  assert.equal(await runCli(["init"], { cwd, ...initStreams.options }), 0);

  const created = streams();
  assert.equal(await runCli(["new", "password-reset", "new"], { cwd, ...created.options }), 0);
  const spec = await readFile(path.join(cwd, "specs/password-reset/spec.md"), "utf8");
  assert.match(spec, /^# Spec: password-reset/m);
  assert.match(await readFile(path.join(cwd, "specs/password-reset/request.md"), "utf8"), /Type: NEW FEATURE/);
  assert.deepEqual((await (await import("node:fs/promises")).readdir(path.join(cwd, "specs/password-reset"))).sort(), ["plan.md", "request.md", "spec.md", "tasks.md"]);

  const invalid = streams();
  assert.equal(await runCli(["new", "../escape", "fix"], { cwd, ...invalid.options }), 1);
  assert.match(invalid.stderr(), /Usage: specsail new/);
  const duplicate = streams();
  assert.equal(await runCli(["new", "password-reset", "fix"], { cwd, ...duplicate.options }), 1);
  assert.match(duplicate.stderr(), /refusing to overwrite/);
});

test("doctor verifies the kit and the project's verify command", async (context) => {
  const cwd = await temporaryProject();
  context.after(() => rm(cwd, { recursive: true, force: true }));
  const initialized = streams();
  assert.equal(await runCli(["init"], { cwd, ...initialized.options }), 0);

  const beforeConfig = streams();
  assert.equal(await runCli(["doctor"], { cwd, ...beforeConfig.options }), 1);
  assert.match(beforeConfig.stderr(), /Makefile still contains the SpecSail starter template/);

  await writeFile(path.join(cwd, "Makefile"), "verify:\n\t@echo configured\n", "utf8");
  const afterConfig = streams();
  assert.equal(await runCli(["doctor"], { cwd, ...afterConfig.options }), 0);
  assert.match(afterConfig.stdout(), /files and verify target are present/);
});

test("doctor flags an AGENTS.md that does not start the conversational workflow", async (context) => {
  const cwd = await temporaryProject();
  context.after(() => rm(cwd, { recursive: true, force: true }));
  const initialized = streams();
  assert.equal(await runCli(["init"], { cwd, ...initialized.options }), 0);
  await writeFile(path.join(cwd, "Makefile"), "verify:\n\t@echo configured\n", "utf8");
  const agentsPath = path.join(cwd, "AGENTS.md");
  await writeFile(agentsPath, (await readFile(agentsPath, "utf8")).replace("skills/manage/SKILL.md", "AGENTS.md"), "utf8");
  const result = streams();
  assert.equal(await runCli(["doctor"], { cwd, ...result.options }), 1);
  assert.match(result.stderr(), /does not start the conversational workflow/);
});

test("init --adapter opencode installs isolated crew agents without overwriting files", async (context) => {
  const cwd = await temporaryProject();
  context.after(() => rm(cwd, { recursive: true, force: true }));

  const plain = streams();
  assert.equal(await runCli(["init"], { cwd, ...plain.options }), 0);
  await assert.rejects(readFile(path.join(cwd, ".opencode/agents/specsail/first-mate.md")), { code: "ENOENT" });

  const installed = streams();
  assert.equal(await runCli(["init", "--adapter", "opencode"], { cwd, ...installed.options }), 0);
  assert.match(installed.stdout(), /Installed the opencode adapter/);
  const firstMate = await readFile(path.join(cwd, ".opencode/agents/specsail/first-mate.md"), "utf8");
  assert.match(firstMate, /^mode: primary$/m);
  assert.match(firstMate, /^model: opencode-go\/gpt-6-luna$/m);
  assert.match(firstMate, /action: subagent/);
  const hands = await readFile(path.join(cwd, ".opencode/agents/specsail/hands.md"), "utf8");
  assert.match(hands, /^mode: subagent$/m);
  assert.match(hands, /resource: "specs\/\*\*"/);
  const adapterReadme = await readFile(path.join(cwd, ".specsail/adapters/opencode/README.md"), "utf8");
  assert.match(adapterReadme, /Default model chains/);
  assert.deepEqual((await readdir(path.join(cwd, ".opencode/agents/specsail"))).sort(), [
    "bosun.md",
    "clerk.md",
    "first-mate.md",
    "hands.md",
    "navigator.md",
    "quartermaster.md",
    "scout.md",
  ]);

  await writeFile(path.join(cwd, ".opencode/agents/specsail/hands.md"), "custom\n", "utf8");
  const second = streams();
  assert.equal(await runCli(["init", "--adapter=opencode"], { cwd, ...second.options }), 0);
  assert.equal(await readFile(path.join(cwd, ".opencode/agents/specsail/hands.md"), "utf8"), "custom\n");
});

test("init rejects unknown or incomplete adapters", async (context) => {
  const cwd = await temporaryProject();
  context.after(() => rm(cwd, { recursive: true, force: true }));
  const unknown = streams();
  assert.equal(await runCli(["init", "--adapter", "vim"], { cwd, ...unknown.options }), 1);
  assert.match(unknown.stderr(), /Unknown adapter: vim/);
  assert.match(unknown.stderr(), /Available adapters: opencode/);
  const missing = streams();
  assert.equal(await runCli(["init", "--adapter"], { cwd, ...missing.options }), 1);
  assert.match(missing.stderr(), /Usage: specsail init \[--adapter opencode\]/);
});

test("doctor checks the OpenCode adapter and agents.env model format", async (context) => {
  const cwd = await temporaryProject();
  context.after(() => rm(cwd, { recursive: true, force: true }));
  const initialized = streams();
  assert.equal(await runCli(["init", "--adapter", "opencode"], { cwd, ...initialized.options }), 0);
  await writeFile(path.join(cwd, "Makefile"), "verify:\n\t@echo configured\n", "utf8");

  const healthy = streams();
  assert.equal(await runCli(["doctor"], { cwd, ...healthy.options }), 0);
  assert.match(healthy.stdout(), /files and verify target are present/);

  const agentPath = path.join(cwd, ".opencode/agents/specsail/hands.md");
  const original = await readFile(agentPath, "utf8");
  await rm(agentPath);
  const missingAgent = streams();
  assert.equal(await runCli(["doctor"], { cwd, ...missingAgent.options }), 1);
  assert.match(missingAgent.stderr(), /Missing \.opencode\/agents\/specsail\/hands\.md/);
  await writeFile(agentPath, original, "utf8");

  await writeFile(path.join(cwd, ".specsail/agents.env"), "AGENT_MODEL_HANDS=claude-sonnet-5-5\n", "utf8");
  const badModel = streams();
  assert.equal(await runCli(["doctor"], { cwd, ...badModel.options }), 1);
  assert.match(badModel.stderr(), /AGENT_MODEL_HANDS must be provider\/model/);

  await writeFile(path.join(cwd, ".specsail/agents.env"), "AGENT_MODEL_HANDS=opencode/claude-sonnet-5-5\nAGENT_MODEL_REVIEW=opencode/kimi-k3#high\n", "utf8");
  const fixed = streams();
  assert.equal(await runCli(["doctor"], { cwd, ...fixed.options }), 0);
});

test("doctor flags an adapter guide without the crew agents", async (context) => {
  const cwd = await temporaryProject();
  context.after(() => rm(cwd, { recursive: true, force: true }));
  const initialized = streams();
  assert.equal(await runCli(["init"], { cwd, ...initialized.options }), 0);
  await writeFile(path.join(cwd, "Makefile"), "verify:\n\t@echo configured\n", "utf8");
  await mkdir(path.join(cwd, ".specsail/adapters/opencode"), { recursive: true });
  await writeFile(path.join(cwd, ".specsail/adapters/opencode/README.md"), "# guide\n", "utf8");
  const result = streams();
  assert.equal(await runCli(["doctor"], { cwd, ...result.options }), 1);
  assert.match(result.stderr(), /adapter guide is installed but \.opencode\/agents\/specsail is missing/);
});

test("update restores kit files, keeps local edits, and honors dry-run and force", async (context) => {
  const cwd = await temporaryProject();
  context.after(() => rm(cwd, { recursive: true, force: true }));
  const initialized = streams();
  assert.equal(await runCli(["init"], { cwd, ...initialized.options }), 0);

  const installed = JSON.parse(await readFile(path.join(cwd, ".specsail/manifest.json"), "utf8"));
  assert.equal(installed.version, manifest.version);
  assert.ok(installed.files[".specsail/skills/manage/SKILL.md"], "manifest tracks kit-owned files");

  await rm(path.join(cwd, ".specsail/skills/manage/SKILL.md"));
  const dry = streams();
  assert.equal(await runCli(["update", "--dry-run"], { cwd, ...dry.options }), 0);
  assert.match(dry.stdout(), /\+ add\s+\.specsail\/skills\/manage\/SKILL\.md/);
  assert.match(dry.stdout(), /nothing written/);
  await assert.rejects(readFile(path.join(cwd, ".specsail/skills/manage/SKILL.md")), { code: "ENOENT" });

  const restored = streams();
  assert.equal(await runCli(["update"], { cwd, ...restored.options }), 0);
  assert.match(await readFile(path.join(cwd, ".specsail/skills/manage/SKILL.md"), "utf8"), /First Mate/);

  await writeFile(path.join(cwd, ".specsail/agents.env.example"), "local note\n", "utf8");
  const conflict = streams();
  assert.equal(await runCli(["update"], { cwd, ...conflict.options }), 1);
  assert.match(conflict.stdout(), /! kept local\s+\.specsail\/agents\.env\.example/);
  assert.match(conflict.stderr(), /--force/);
  assert.equal(await readFile(path.join(cwd, ".specsail/agents.env.example"), "utf8"), "local note\n");

  const forced = streams();
  assert.equal(await runCli(["update", "--force"], { cwd, ...forced.options }), 0);
  assert.match(await readFile(path.join(cwd, ".specsail/agents.env.example"), "utf8"), /AGENT_CLI_REVIEW/);
});

test("update refreshes managed sections, stamps versions, and adds adapters only when asked", async (context) => {
  const cwd = await temporaryProject();
  context.after(() => rm(cwd, { recursive: true, force: true }));
  const initialized = streams();
  assert.equal(await runCli(["init"], { cwd, ...initialized.options }), 0);
  await writeFile(path.join(cwd, "Makefile"), "verify:\n\t@echo configured\n", "utf8");

  // Consumer text outside the managed markers must survive an update.
  const agentsPath = path.join(cwd, "AGENTS.md");
  await writeFile(agentsPath, `# Project rules\n\n${await readFile(agentsPath, "utf8")}\n\nMy local addendum.\n`, "utf8");
  await writeFile(path.join(cwd, ".specsail.json"), JSON.stringify({ version: "0.0.1" }), "utf8");

  const updated = streams();
  assert.equal(await runCli(["update"], { cwd, ...updated.options }), 0);
  const agents = await readFile(agentsPath, "utf8");
  assert.match(agents, /# Project rules/);
  assert.match(agents, /My local addendum\./);
  assert.equal(agents.split("<!-- specsail:start -->").length - 1, 1);
  assert.deepEqual(JSON.parse(await readFile(path.join(cwd, ".specsail.json"), "utf8")), { version: manifest.version });

  // No adapter installed -> plain update must not create OpenCode files.
  const plain = streams();
  assert.equal(await runCli(["update"], { cwd, ...plain.options }), 0);
  await assert.rejects(readFile(path.join(cwd, ".opencode/agents/specsail/first-mate.md")), { code: "ENOENT" });

  // --adapter adds it, and the manifest tracks it without a leading slash.
  const withAdapter = streams();
  assert.equal(await runCli(["update", "--adapter", "opencode"], { cwd, ...withAdapter.options }), 0);
  assert.match(await readFile(path.join(cwd, ".opencode/agents/specsail/first-mate.md"), "utf8"), /mode: primary/);
  const adapterManifest = JSON.parse(await readFile(path.join(cwd, ".specsail/manifest.json"), "utf8"));
  assert.ok(adapterManifest.files[".opencode/agents/specsail/first-mate.md"], "adapter files are tracked with project-relative keys");
});

test("update refuses unknown options and uninitialized projects; init and doctor point at it", async (context) => {
  const cwd = await temporaryProject();
  context.after(() => rm(cwd, { recursive: true, force: true }));

  const uninitialized = streams();
  assert.equal(await runCli(["update"], { cwd, ...uninitialized.options }), 1);
  assert.match(uninitialized.stderr(), /not initialized/);

  const initialized = streams();
  assert.equal(await runCli(["init"], { cwd, ...initialized.options }), 0);
  await writeFile(path.join(cwd, "Makefile"), "verify:\n\t@echo configured\n", "utf8");

  const unknown = streams();
  assert.equal(await runCli(["update", "--yes"], { cwd, ...unknown.options }), 1);
  assert.match(unknown.stderr(), /Unknown option for update/);
  const unknownAdapter = streams();
  assert.equal(await runCli(["update", "--adapter", "vim"], { cwd, ...unknownAdapter.options }), 1);
  assert.match(unknownAdapter.stderr(), /Unknown adapter/);

  // A stale install: doctor fails, init hints, update fixes.
  const manifestPath = path.join(cwd, ".specsail/manifest.json");
  const stale = JSON.parse(await readFile(manifestPath, "utf8"));
  stale.version = "0.2.1";
  await writeFile(manifestPath, `${JSON.stringify(stale, null, 2)}\n`, "utf8");
  const staleDoctor = streams();
  assert.equal(await runCli(["doctor"], { cwd, ...staleDoctor.options }), 1);
  assert.match(staleDoctor.stderr(), /run specsail update/);
  const hint = streams();
  assert.equal(await runCli(["init"], { cwd, ...hint.options }), 0);
  assert.match(hint.stdout(), /run `specsail update` to upgrade/);
  const fixed = streams();
  assert.equal(await runCli(["update"], { cwd, ...fixed.options }), 0);
  const healthy = streams();
  assert.equal(await runCli(["doctor"], { cwd, ...healthy.options }), 0);
});

test("init refuses to write through a symlinked SpecSail directory", async (context) => {
  const cwd = await temporaryProject();
  const outside = await temporaryProject();
  context.after(async () => {
    await rm(cwd, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  });
  try {
    await symlink(outside, path.join(cwd, ".specsail"), "dir");
  } catch (failure) {
    context.skip(`symlink creation unavailable: ${failure.message}`);
    return;
  }
  const result = streams();
  assert.equal(await runCli(["init"], { cwd, ...result.options }), 1);
  assert.match(result.stderr(), /Refusing to write through a symlink/);
  await assert.rejects(readFile(path.join(outside, "skills/understand/SKILL.md")), { code: "ENOENT" });
});
