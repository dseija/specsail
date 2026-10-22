import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const workflowPath = new URL("../.github/workflows/release.yml", import.meta.url);
const shipped = existsSync(workflowPath);

test("release workflow publishes with OIDC and provenance", { skip: !shipped && "release workflow is not included in the published tarball" }, async () => {
  const workflow = await readFile(workflowPath, "utf8");
  assert.match(workflow, /^on:\s*\n\s*push:\s*\n\s*tags:\s*\["v\*"\]/m);
  assert.match(workflow, /^\s*id-token:\s*write$/m);
  assert.match(workflow, /^\s*contents:\s*write$/m);
  assert.match(workflow, /^\s*environment:\s*npm$/m);
  assert.match(workflow, /npm publish --access public --provenance/);
  assert.doesNotMatch(workflow, /NODE_AUTH_TOKEN|NPM_TOKEN|secrets\./);
});
