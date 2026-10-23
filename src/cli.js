import { access, copyFile, lstat, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stageRoles = ["understand", "plan", "acceptance-tests", "implement", "review", "ship"];
const skillRoles = ["manage", ...stageRoles];
const typeNames = {
  fix: "FIX",
  update: "FEATURE UPDATE",
  new: "NEW FEATURE",
};
const manifestName = path.join(".specsail", "manifest.json");
const managedAgentsSection = "## SpecSail\n\nThis project uses SpecSail, a Captain-led, spec-driven development workflow. When the user asks for a non-trivial feature, fix, or update, start the workflow before writing code: read .specsail/skills/manage/SKILL.md and follow it. The First Mate orchestrates the crew; the human Captain answers questions, approves specs and acceptance tests, and merges. Commands are optional. Read .specsail/AGENTS.md for the crew and rules.";
const managedGitignoreSection = ".specsail/agents.env";

const help = `SpecSail — navigate by spec, deliver with confidence.

Usage:
  specsail init [--adapter opencode]
                                     Add SpecSail to the current project, optionally
                                     with a vendor agent adapter
  specsail update [--dry-run] [--force] [--adapter opencode]
                                     Upgrade installed SpecSail files. Local edits
                                     are reported and kept unless --force is given
  specsail new <slug> <fix|update|new>
                                     Create a feature's request/spec/plan/tasks
  specsail doctor                    Check the current project's SpecSail setup
  specsail --version                 Print the installed version
  specsail --help                    Show this help

The Captain is always human. SpecSail does not approve specs/tests or merge PRs.
`;

const adapters = {
  opencode: "templates/adapters/opencode",
};

function writeLine(stream, text) {
  stream(`${text}\n`);
}

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function lstatIfExists(filePath) {
  try {
    return await lstat(filePath);
  } catch (failure) {
    if (failure.code === "ENOENT") return undefined;
    throw failure;
  }
}

async function ensureSafeDirectory(projectRoot, directory) {
  const relative = path.relative(projectRoot, directory);
  if (relative && (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))) {
    throw new Error(`Refusing to write outside the project: ${directory}`);
  }
  let current = projectRoot;
  for (const segment of relative ? relative.split(path.sep) : []) {
    current = path.join(current, segment);
    try {
      const details = await lstat(current);
      if (details.isSymbolicLink() || !details.isDirectory()) {
        throw new Error(`Refusing to write through a symlink or non-directory path: ${current}`);
      }
    } catch (failure) {
      if (failure.code !== "ENOENT") throw failure;
      await mkdir(current);
    }
  }
}

async function copyTree(source, destination, { suffixes, projectRoot } = {}) {
  let created = 0;
  let skipped = 0;
  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await ensureSafeDirectory(projectRoot, destinationPath);
      const result = await copyTree(sourcePath, destinationPath, { suffixes, projectRoot });
      created += result.created;
      skipped += result.skipped;
    } else if (entry.isFile() && (!suffixes || suffixes.some((suffix) => entry.name.endsWith(suffix)))) {
      await ensureSafeDirectory(projectRoot, path.dirname(destinationPath));
      try {
        const sourceStat = await stat(sourcePath);
        await copyFile(sourcePath, destinationPath, constants.COPYFILE_EXCL);
        await access(destinationPath, constants.F_OK);
        if (process.platform !== "win32") await import("node:fs/promises").then(({ chmod }) => chmod(destinationPath, sourceStat.mode));
        created += 1;
      } catch (error) {
        if (error.code === "EEXIST") skipped += 1;
        else throw error;
      }
    }
  }
  return { created, skipped };
}

async function copyFileIfMissing(source, destination, projectRoot) {
  await ensureSafeDirectory(projectRoot, path.dirname(destination));
  try {
    const sourceStat = await stat(source);
    await copyFile(source, destination, constants.COPYFILE_EXCL);
    if (process.platform !== "win32") await import("node:fs/promises").then(({ chmod }) => chmod(destination, sourceStat.mode));
    return true;
  } catch (error) {
    if (error.code === "EEXIST") return false;
    throw error;
  }
}

async function updateManagedBlock(filePath, marker, text, projectRoot) {
  await ensureSafeDirectory(projectRoot, path.dirname(filePath));
  let current = "";
  const details = await lstatIfExists(filePath);
  if (details) {
    if (details.isSymbolicLink() || !details.isFile()) throw new Error(`Refusing to modify symlink or non-file: ${filePath}`);
    current = await readFile(filePath, "utf8");
  }
  const [start, end] = marker;
  const startCount = current.split(start).length - 1;
  const endCount = current.split(end).length - 1;
  if (startCount !== endCount || startCount > 1) {
    throw new Error(`Cannot safely update managed section in ${path.relative(process.cwd(), filePath)}: markers are unbalanced or duplicated.`);
  }
  const section = `${start}\n${text.trim()}\n${end}`;
  if (startCount === 1) {
    const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    current = current.replace(new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}`), section);
  } else {
    current = `${current.trimEnd()}${current.trim() ? "\n\n" : ""}${section}\n`;
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, current, "utf8");
}

async function loadInstalledConfig(configPath) {
  try {
    const details = await lstatIfExists(configPath);
    if (!details) return {};
    if (details.isSymbolicLink() || !details.isFile()) throw new Error("expected a regular file, not a symlink");
    const parsed = JSON.parse(await readFile(configPath, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("expected a JSON object");
    return parsed;
  } catch (error) {
    throw new Error(`Cannot read .specsail.json: ${error.message}`);
  }
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function readOptional(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

async function listFiles(source, suffixes) {
  const files = [];
  const walk = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(entryPath);
      else if (entry.isFile() && (!suffixes || suffixes.some((suffix) => entry.name.endsWith(suffix)))) files.push(entryPath);
    }
  };
  await walk(source);
  return files;
}

// Kit-owned files, as project-relative POSIX paths. Consumer-owned files
// (Makefile, docs/project.md, .github/**) are deliberately absent.
async function kitFilePairs(root, adapter) {
  const specs = [
    { source: path.join(root, "templates/.specsail"), destination: ".specsail" },
    { source: path.join(root, "skills"), destination: ".specsail/skills" },
    { source: path.join(root, "scripts"), destination: ".specsail/scripts", suffixes: [".sh"] },
    { source: path.join(root, "templates/specs/_templates"), destination: ".specsail/templates/specs/_templates" },
    { source: path.join(root, "docs/workflow.md"), destination: ".specsail/docs/workflow.md", single: true },
    { source: path.join(root, "docs/runbook.md"), destination: ".specsail/docs/runbook.md", single: true },
  ];
  if (adapter) specs.push({ source: path.join(root, adapters[adapter]), destination: "" });
  const pairs = [];
  for (const spec of specs) {
    if (spec.single) {
      pairs.push({ source: spec.source, destination: spec.destination });
      continue;
    }
    for (const file of await listFiles(spec.source, spec.suffixes)) {
      const relative = path.relative(spec.source, file).split(path.sep).join("/");
      pairs.push({ source: file, destination: spec.destination ? `${spec.destination}/${relative}` : relative });
    }
  }
  return pairs;
}

async function loadManifest(cwd) {
  const content = await readOptional(path.join(cwd, manifestName));
  if (content === undefined) return { version: undefined, files: {} };
  try {
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("expected a JSON object");
    return { version: typeof parsed.version === "string" ? parsed.version : undefined, files: parsed.files && typeof parsed.files === "object" && !Array.isArray(parsed.files) ? parsed.files : {} };
  } catch (error) {
    throw new Error(`Cannot read .specsail/manifest.json: ${error.message}`);
  }
}

async function saveManifest(cwd, manifest) {
  const manifestPath = path.join(cwd, manifestName);
  await ensureSafeDirectory(cwd, path.dirname(manifestPath));
  await writeFile(manifestPath, `${JSON.stringify({ version: manifest.version, files: manifest.files }, null, 2)}\n`, "utf8");
}

// Record every installed file whose content still matches the package: that is
// the contract update uses to tell "untouched kit file" from "local edit".
async function rebuildManifest(cwd, root, adapter, version) {
  const previous = await loadManifest(cwd);
  const files = {};
  for (const [destination, hash] of Object.entries(previous.files)) {
    const local = await readOptional(path.join(cwd, destination));
    if (local !== undefined && sha256(local) === hash) files[destination] = hash;
  }
  for (const pair of await kitFilePairs(root, adapter)) {
    const local = await readOptional(path.join(cwd, pair.destination));
    const source = await readFile(pair.source, "utf8");
    if (local !== undefined && sha256(local) === sha256(source)) files[pair.destination] = sha256(local);
  }
  return { version, files };
}

async function init(cwd, output, root, adapter) {
  const configPath = path.join(cwd, ".specsail.json");
  const config = await loadInstalledConfig(configPath);
  const operations = [
    [path.join(root, "templates/.specsail"), path.join(cwd, ".specsail")],
    [path.join(root, "skills"), path.join(cwd, ".specsail/skills")],
    [path.join(root, "scripts"), path.join(cwd, ".specsail/scripts"), { suffixes: [".sh"] }],
    [path.join(root, "templates/specs/_templates"), path.join(cwd, ".specsail/templates/specs/_templates")],
  ];
  let created = 0;
  let skipped = 0;
  for (const [source, destination, options] of operations) {
    const result = await copyTree(source, destination, { ...options, projectRoot: cwd });
    created += result.created;
    skipped += result.skipped;
  }
  if (adapter) {
    const result = await copyTree(path.join(root, adapters[adapter]), cwd, { projectRoot: cwd });
    created += result.created;
    skipped += result.skipped;
  }

  const individualFiles = [
    [path.join(root, "docs/workflow.md"), path.join(cwd, ".specsail/docs/workflow.md")],
    [path.join(root, "docs/runbook.md"), path.join(cwd, ".specsail/docs/runbook.md")],
    [path.join(root, "templates/Makefile"), path.join(cwd, "Makefile")],
    [path.join(root, "templates/docs/project.md"), path.join(cwd, "docs/project.md")],
    [path.join(root, "templates/docs/architecture.md"), path.join(cwd, "docs/architecture.md")],
    [path.join(root, "templates/docs/architecture/.gitkeep"), path.join(cwd, "docs/architecture/.gitkeep")],
    [path.join(root, "templates/.github/CODEOWNERS"), path.join(cwd, ".github/CODEOWNERS")],
    [path.join(root, "templates/.github/workflows/verify.yml"), path.join(cwd, ".github/workflows/verify.yml")],
  ];
  for (const [source, destination] of individualFiles) {
    if (await copyFileIfMissing(source, destination, cwd)) created += 1;
    else skipped += 1;
  }

  await updateManagedBlock(
    path.join(cwd, "AGENTS.md"),
    ["<!-- specsail:start -->", "<!-- specsail:end -->"],
    managedAgentsSection,
    cwd,
  );
  await updateManagedBlock(
    path.join(cwd, ".gitignore"),
    ["# >>> SpecSail >>>", "# <<< SpecSail <<<"],
    managedGitignoreSection,
    cwd,
  );
  const previousVersion = await loadManifest(cwd)
    .then((installed) => installed.version ?? (typeof config.version === "string" ? config.version : undefined))
    .catch(() => (typeof config.version === "string" ? config.version : undefined));
  config.version = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")).version;
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  await saveManifest(cwd, await rebuildManifest(cwd, root, adapter, config.version));
  writeLine(output, `SpecSail initialized (${config.version}). Added ${created} file(s); left ${skipped} existing file(s) unchanged.`);
  if (adapter) {
    writeLine(output, `Installed the ${adapter} adapter. Start a session with specsail/first-mate; per-role models live in .specsail/agents.env.`);
  }
  if (previousVersion && previousVersion !== config.version) {
    writeLine(output, `Existing files were last installed at ${previousVersion}; run \`specsail update\` to upgrade them.`);
  }
  writeLine(output, "Next: open your coding agent and ask for a change. The First Mate will check the project docs and Makefile, ask what is missing, and start the workflow.");
  return 0;
}

function parseUpdateOptions(args) {
  const options = { dryRun: false, force: false, adapter: undefined };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--dry-run" || argument === "-n") {
      options.dryRun = true;
    } else if (argument === "--force") {
      options.force = true;
    } else if (argument === "--adapter" || argument === "-a") {
      options.adapter = args[index + 1];
      index += 1;
      if (!options.adapter || options.adapter.startsWith("-")) throw new Error("Usage: specsail update [--dry-run] [--force] [--adapter opencode]");
    } else if (argument.startsWith("--adapter=")) {
      options.adapter = argument.slice("--adapter=".length);
      if (!options.adapter) throw new Error("Usage: specsail update [--dry-run] [--force] [--adapter opencode]");
    } else {
      throw new Error(`Unknown option for update: ${argument}. Run specsail --help for usage.`);
    }
  }
  if (options.adapter && !Object.hasOwn(adapters, options.adapter)) {
    throw new Error(`Unknown adapter: ${options.adapter}. Available adapters: ${Object.keys(adapters).join(", ")}.`);
  }
  return options;
}

async function update(cwd, args, output, error, root) {
  const options = parseUpdateOptions(args);
  const configPath = path.join(cwd, ".specsail.json");
  if (!(await exists(configPath))) throw new Error("SpecSail is not initialized here. Run `specsail init` first.");
  const config = await loadInstalledConfig(configPath);
  const manifest = await loadManifest(cwd);
  const adapterInstalled = (await exists(path.join(cwd, ".opencode/agents/specsail"))) || (await exists(path.join(cwd, ".specsail/adapters/opencode")));
  const adapter = options.adapter ?? (adapterInstalled ? "opencode" : undefined);

  const plan = [];
  for (const pair of await kitFilePairs(root, adapter)) {
    const source = await readFile(pair.source, "utf8");
    const sourceHash = sha256(source);
    const local = await readOptional(path.join(cwd, pair.destination));
    let action;
    if (local === undefined) action = "add";
    else if (sha256(local) === sourceHash) action = "same";
    else if (manifest.files[pair.destination] && sha256(local) === manifest.files[pair.destination]) action = "update";
    else action = options.force ? "force" : "conflict";
    plan.push({ ...pair, sourceHash, action });
  }

  const counts = { add: 0, update: 0, force: 0, same: 0, conflict: 0 };
  for (const entry of plan) counts[entry.action] += 1;
  const packageVersion = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")).version;
  const marks = { add: "+ add        ", update: "~ update      ", force: "> force      ", conflict: "! kept local " };
  writeLine(output, `SpecSail update${options.dryRun ? " (dry run)" : ""}: installed ${manifest.version ?? "pre-manifest"}, package ${packageVersion}.`);
  for (const entry of plan) {
    if (entry.action !== "same") writeLine(output, `  ${marks[entry.action]} ${entry.destination}`);
  }
  writeLine(output, `  = up to date  ${counts.same} file(s)`);
  if (!options.dryRun) {
    for (const entry of plan) {
      if (entry.action === "add" || entry.action === "update" || entry.action === "force") {
        const destinationPath = path.join(cwd, entry.destination);
        await ensureSafeDirectory(cwd, path.dirname(destinationPath));
        await copyFile(entry.source, destinationPath);
        if (process.platform !== "win32") {
          const { chmod } = await import("node:fs/promises");
          chmod(destinationPath, (await stat(entry.source)).mode);
        }
        manifest.files[entry.destination] = entry.sourceHash;
      }
    }
    await updateManagedBlock(path.join(cwd, "AGENTS.md"), ["<!-- specsail:start -->", "<!-- specsail:end -->"], managedAgentsSection, cwd);
    await updateManagedBlock(path.join(cwd, ".gitignore"), ["# >>> SpecSail >>>", "# <<< SpecSail <<<"], managedGitignoreSection, cwd);
    config.version = packageVersion;
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    manifest.version = packageVersion;
    await saveManifest(cwd, manifest);
  }
  const applied = counts.add + counts.update + counts.force;
  writeLine(output, `Summary: ${applied} file(s) taken from the package, ${counts.conflict} kept local, ${counts.same} unchanged.${options.dryRun ? " Dry run — nothing written." : ""}`);
  if (counts.conflict) {
    writeLine(error, `${counts.conflict} file(s) have local content (listed above) and were kept. Review them, or run \`specsail update --force\` to take the package version.`);
    return 1;
  }
  if (!options.dryRun) writeLine(output, "Managed sections in AGENTS.md and .gitignore were refreshed; .specsail.json records the new version.");
  return 0;
}

function parseInitOptions(args) {
  let adapter;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--adapter" || argument === "-a") {
      adapter = args[index + 1];
      index += 1;
      if (!adapter || adapter.startsWith("-")) throw new Error("Usage: specsail init [--adapter opencode]");
    } else if (argument.startsWith("--adapter=")) {
      adapter = argument.slice("--adapter=".length);
      if (!adapter) throw new Error("Usage: specsail init [--adapter opencode]");
    } else {
      throw new Error(`Unknown option for init: ${argument}. Run specsail --help for usage.`);
    }
  }
  if (adapter && !Object.hasOwn(adapters, adapter)) {
    throw new Error(`Unknown adapter: ${adapter}. Available adapters: ${Object.keys(adapters).join(", ")}.`);
  }
  return adapter;
}

function validSlug(slug) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

async function newFeature(cwd, args, output) {
  const [slug, kind, ...extra] = args;
  if (!slug || !kind || extra.length || !validSlug(slug) || !Object.hasOwn(typeNames, kind)) {
    throw new Error("Usage: specsail new <lowercase-kebab-slug> <fix|update|new>");
  }
  const specsailRoot = path.join(cwd, ".specsail");
  const templates = path.join(specsailRoot, "templates/specs/_templates");
  if (!(await exists(templates))) throw new Error("SpecSail is not initialized here. Run `specsail init` first.");
  const destination = path.join(cwd, "specs", slug);
  if (await exists(destination)) throw new Error(`specs/${slug} already exists; refusing to overwrite it.`);
  const entries = ["request.md", "spec.md", "plan.md", "tasks.md"];
  await ensureSafeDirectory(cwd, path.join(cwd, "specs"));
  await mkdir(destination, { recursive: true });
  try {
    for (const entry of entries) {
      const source = await readFile(path.join(templates, entry), "utf8");
      const content = source.replaceAll("{{SLUG}}", slug).replaceAll("{{TYPE}}", typeNames[kind]);
      await writeFile(path.join(destination, entry), content, { flag: "wx" });
    }
  } catch (error) {
    throw new Error(`Could not scaffold specs/${slug}: ${error.message}. Remove the partial directory before retrying.`);
  }
  writeLine(output, `Created specs/${slug}/. Next: ask your agent to start the SpecSail workflow for ${slug}; the First Mate will continue from the request stage.`);
  return 0;
}

async function hasGitRepository(cwd) {
  let current = cwd;
  while (true) {
    if (await exists(path.join(current, ".git"))) return true;
    const parent = path.dirname(current);
    if (parent === current) return false;
    current = parent;
  }
}

async function doctor(cwd, output, error, root) {
  const failures = [];
  const checks = [
    [".specsail.json", path.join(cwd, ".specsail.json")],
    [".specsail/AGENTS.md", path.join(cwd, ".specsail/AGENTS.md")],
    ["AGENTS.md SpecSail section", path.join(cwd, "AGENTS.md")],
  ];
  for (const [label, filePath] of checks) {
    if (!(await exists(filePath))) failures.push(`Missing ${label}; run specsail init.`);
  }
  for (const stage of skillRoles) {
    const skill = path.join(cwd, ".specsail/skills", stage, "SKILL.md");
    if (!(await exists(skill))) failures.push(`Missing ${path.relative(cwd, skill)}; run specsail init.`);
  }
  const adapterDir = path.join(cwd, ".opencode/agents/specsail");
  const adapterGuide = path.join(cwd, ".specsail/adapters/opencode/README.md");
  if (await exists(adapterDir)) {
    for (const name of ["first-mate", "scout", "navigator", "quartermaster", "hands", "bosun", "clerk"]) {
      const agentPath = path.join(adapterDir, `${name}.md`);
      if (!(await exists(agentPath))) {
        failures.push(`Missing .opencode/agents/specsail/${name}.md; re-run specsail init --adapter opencode.`);
        continue;
      }
      const agent = await readFile(agentPath, "utf8");
      for (const field of ["mode", "model", "permissions"]) {
        if (!new RegExp(`^${field}:`, "m").test(agent)) {
          failures.push(`.opencode/agents/specsail/${name}.md is missing ${field}; re-run specsail init --adapter opencode.`);
        }
      }
    }
  } else if (await exists(adapterGuide)) {
    failures.push("The OpenCode adapter guide is installed but .opencode/agents/specsail is missing; run specsail init --adapter opencode.");
  }
  const agentsEnvPath = path.join(cwd, ".specsail/agents.env");
  if (await exists(agentsEnvPath)) {
    for (const line of (await readFile(agentsEnvPath, "utf8")).split("\n")) {
      const match = line.match(/^\s*(AGENT_MODEL_[A-Z_]+)\s*=\s*(.*)$/);
      if (!match) continue;
      const value = match[2].trim();
      if (value && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(#\S+)?$/.test(value)) {
        failures.push(`${match[1]} must be provider/model or provider/model#variant (got "${value}").`);
      }
    }
  }
  const manifestPath = path.join(cwd, ".specsail/manifest.json");
  if (await exists(manifestPath)) {
    try {
      const installed = JSON.parse(await readFile(manifestPath, "utf8"));
      const packageVersion = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")).version;
      if (installed.version && installed.version !== packageVersion) {
        failures.push(`SpecSail files are installed at ${installed.version} but this CLI is ${packageVersion}; run specsail update.`);
      }
    } catch {
      failures.push(".specsail/manifest.json is unreadable; run specsail update to rebuild it.");
    }
  }
  const makefile = path.join(cwd, "Makefile");
  const makefileContent = await exists(makefile) ? await readFile(makefile, "utf8") : "";
  if (!/^verify\s*:/m.test(makefileContent)) {
    failures.push("Makefile must define a verify target. Configure it for this project's stack.");
  } else if (makefileContent.includes("SPECSAIL_UNCONFIGURED_TEMPLATE")) {
    failures.push("Makefile still contains the SpecSail starter template. Configure setup, lint, typecheck, test, and accept before relying on make verify.");
  }
  const agents = await exists(path.join(cwd, "AGENTS.md")) ? await readFile(path.join(cwd, "AGENTS.md"), "utf8") : "";
  if (!agents.includes("<!-- specsail:start -->") || !agents.includes("<!-- specsail:end -->")) {
    failures.push("AGENTS.md is missing the SpecSail managed section; run specsail init.");
  } else if (!agents.includes("skills/manage/SKILL.md")) {
    failures.push("AGENTS.md does not start the conversational workflow; update the SpecSail section or run specsail init again.");
  }
  if (!(await hasGitRepository(cwd))) writeLine(error, "Warning: no .git directory found. Initialize version control before starting a feature.");
  if (failures.length) {
    for (const failure of failures) writeLine(error, `✗ ${failure}`);
    return 1;
  }
  writeLine(output, "✓ SpecSail files and verify target are present.");
  return 0;
}

export async function runCli(args, options = {}) {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const root = path.resolve(options.packageRoot ?? packageRoot);
  const output = options.stdout ?? ((text) => process.stdout.write(text));
  const error = options.stderr ?? ((text) => process.stderr.write(text));
  const [command, ...rest] = args;
  try {
    if (!command || command === "--help" || command === "-h" || command === "help") {
      writeLine(output, help);
      return 0;
    }
    if (command === "--version" || command === "-v" || command === "version") {
      const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
      writeLine(output, manifest.version);
      return 0;
    }
    if (command === "init") return await init(cwd, output, root, parseInitOptions(rest));
    if (command === "update") return await update(cwd, rest, output, error, root);
    if (command === "new") return await newFeature(cwd, rest, output);
    if (command === "doctor") return await doctor(cwd, output, error, root);
    throw new Error(`Unknown command: ${command}. Run specsail --help for usage.`);
  } catch (failure) {
    writeLine(error, `Error: ${failure.message}`);
    return 1;
  }
}
