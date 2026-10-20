import assert from "node:assert/strict";
import { test } from "node:test";
import { runCli } from "../src/cli.js";

const root = new URL("../", import.meta.url).pathname;

test("help and version are available without initializing a project", async () => {
  let stdout = "";
  let stderr = "";
  const options = { packageRoot: root, stdout: (text) => { stdout += text; }, stderr: (text) => { stderr += text; } };
  assert.equal(await runCli(["--help"], options), 0);
  assert.match(stdout, /Captain is always human/);
  assert.equal(await runCli(["--version"], options), 0);
  assert.match(stdout, /0\.1\.0/);
  assert.equal(stderr, "");
});

test("unknown commands fail with a useful hint", async () => {
  let stderr = "";
  const status = await runCli(["sail"], { stderr: (text) => { stderr += text; } });
  assert.equal(status, 1);
  assert.match(stderr, /Unknown command: sail/);
  assert.match(stderr, /specsail --help/);
});
