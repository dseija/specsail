# SpecSail OpenCode adapter

Installed by `npx specsail init --adapter opencode`. It adds the SpecSail crew as OpenCode agents:

- `.opencode/agents/specsail/first-mate.md` — primary agent; spawns the crew and owns the Captain's gates.
- `.opencode/agents/specsail/{scout,navigator,quartermaster,hands,bosun,clerk}.md` — subagents, one per stage, each with scoped permissions.

Agent IDs are `specsail/first-mate`, `specsail/scout`, and so on. Start a session with `specsail/first-mate`, or make it the default primary agent by adding this to your own `opencode.jsonc` (the kit never writes that file):

```jsonc
{ "default_agent": "specsail/first-mate" }
```

## Choosing models

The Captain chooses the model for every role. At spawn time the First Mate reads `.specsail/agents.env` and passes the resolved model, so the config there wins over the `model:` line in each agent file.

```sh
cp .specsail/agents.env.example .specsail/agents.env   # gitignored
# then set, for example:
# AGENT_MODEL_IMPLEMENT=opencode-go/deepseek-v4.1-flash
# AGENT_MODEL_REVIEW=opencode-go/kimi-k3#high
```

A variant is part of the model string: `provider/model#variant`. An empty value uses the first entry of the role's default chain below.

The First Mate's own model is the one you select for the primary session (or set on `specsail/first-mate`); `AGENT_MODEL_MANAGE` applies to headless runs.

## Default model chains

Each model lists the providers that serve it, tried left to right; the first entry of the chain is the default. `go` = `opencode-go/`, `oc` = `opencode/`. Later entries are fallbacks when a model or provider is unavailable.

| Role | Chain |
|---|---|
| First Mate (`manage`) | `gpt-6-luna [go, oc]` → `deepseek-v4.1-flash [go, oc]` → `mimo-v2.6-flash [go]` → `claude-sonnet-5-5 [oc]` → `gemini-3.8-flash [oc]` → `glm-5.3-flash [go, oc]` → `qwen3.8-flash [go, oc]` |
| Scout (`understand`) | `claude-opus-5-5 [oc]` → `gpt-6.1-sol [oc]` → `gemini-4-argon [oc]` → `kimi-k3 [go, oc]` → `grok-4.7 [go, oc]` → `deepseek-v4-pro [go, oc]` → `mimo-v2.6-pro [go]` → `glm-5.3 [go, oc]` → `qwen3.8-max [go, oc]` |
| Navigator (`plan`) | `claude-opus-5-5 [oc]` → `gpt-6.1-sol [oc]` → `kimi-k3 [go, oc]` → `grok-4.7 [go, oc]` → `deepseek-v4-pro [go, oc]` → `mimo-v2.6-pro [go]` → `gemini-4-argon [oc]` → `glm-5.3 [go, oc]` → `qwen3.8-max [go, oc]` |
| Quartermaster (`acceptance-tests`) | `claude-sonnet-5-5 [oc]` → `gpt-6-luna [go, oc]` → `gemini-4-argon [oc]` → `deepseek-v4.1-flash [go, oc]` → `mimo-v2.6-flash [go]` → `glm-5.3-flash [go, oc]` → `qwen3.8-flash [go, oc]` |
| Hands (`implement`) | `claude-sonnet-5-5 [oc]` → `gpt-6-luna [go, oc]` → `deepseek-v4.1-flash [go, oc]` → `mimo-v2.6-flash [go]` → `gemini-4-argon [oc]` → `glm-5.3-flash [go, oc]` → `qwen3.8-flash [go, oc]` |
| Bosun (`review`) | `gpt-6.1-sol [oc]` → `claude-opus-5-5 [oc]` → `kimi-k3 [go, oc]` → `grok-4.7 [go, oc]` → `deepseek-v4-pro [go, oc]` → `mimo-v2.6-pro [go]` → `gemini-4-argon [oc]` → `glm-5.3 [go, oc]` → `qwen3.8-max [go, oc]` |
| Clerk (`ship`) | `mimo-v2.6-flash [go]` → `deepseek-v4.1-flash [go, oc]` → `claude-haiku-5-5 [go, oc]` → `gpt-6-luna [go, oc]` → `glm-5.3-flash [go, oc]` → `gemini-3.8-flash [oc]` → `qwen3.8-flash [go, oc]` |

Models tagged `[oc]` only (Sonnet/Opus 5.5, GPT-6.1 Sol, Gemini 4 Argon, Gemini 3.8 Flash) need the `opencode` provider; when it is unavailable, the First Mate falls back to the next chain entry and records the substitution.

## Independence and permissions

- **Review:** Bosun uses a different model family than Hands and skips families already used by Hands. If no other family is available, the Captain must accept a same-family review and the caveat is recorded in `review.md`.
- **Permissions:** Bosun can only write `review.md` and `tasks.md`. Hands cannot edit `specs/**` or `tests/acceptance/**`. Quartermaster can only write acceptance tests. Clerk cannot edit source, specs, or tests. Adjust these in the agent files if your project layout differs.

## Notes

- `specsail init --adapter opencode` never overwrites existing files. To change a default, edit the agent file or set the role in `.specsail/agents.env`.
- `.specsail/agents.env` is gitignored, so committed model defaults live in these agent files; use `agents.env` for local choices.
- The adapter is optional. SpecSail's conversational workflow works with any agent tool that reads Markdown.
