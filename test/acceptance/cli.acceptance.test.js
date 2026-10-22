import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
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
