import { access, copyFile, lstat, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
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

const help = `SpecSail — navigate by spec, deliver with confidence.

Usage:
  specsail init [--adapter opencode]
                                     Add SpecSail to the current project, optionally
                                     with a vendor agent adapter
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
    "## SpecSail\n\nThis project uses SpecSail, a Captain-led, spec-driven development workflow. When the user asks for a non-trivial feature, fix, or update, start the workflow before writing code: read .specsail/skills/manage/SKILL.md and follow it. The First Mate orchestrates the crew; the human Captain answers questions, approves specs and acceptance tests, and merges. Commands are optional. Read .specsail/AGENTS.md for the crew and rules.",
    cwd,
  );
  await updateManagedBlock(
    path.join(cwd, ".gitignore"),
    ["# >>> SpecSail >>>", "# <<< SpecSail <<<"],
    ".specsail/agents.env",
    cwd,
  );
  config.version = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")).version;
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  writeLine(output, `SpecSail initialized (${config.version}). Added ${created} file(s); left ${skipped} existing file(s) unchanged.`);
  if (adapter) {
    writeLine(output, `Installed the ${adapter} adapter. Start a session with specsail/first-mate; per-role models live in .specsail/agents.env.`);
  }
  writeLine(output, "Next: open your coding agent and ask for a change. The First Mate will check the project docs and Makefile, ask what is missing, and start the workflow.");
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

async function doctor(cwd, output, error) {
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
    if (command === "new") return await newFeature(cwd, rest, output);
    if (command === "doctor") return await doctor(cwd, output, error);
    throw new Error(`Unknown command: ${command}. Run specsail --help for usage.`);
  } catch (failure) {
    writeLine(error, `Error: ${failure.message}`);
    return 1;
  }
}
