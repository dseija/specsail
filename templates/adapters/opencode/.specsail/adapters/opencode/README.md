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
# AGENT_MODEL_IMPLEMENT=opencode/claude-sonnet-5-5
# AGENT_MODEL_REVIEW=opencode/kimi-k3#high
```

A variant is part of the model string: `provider/model#variant`. An empty value uses the first entry of the role's default chain below.

The First Mate's own model is the one you select for the primary session (or set on `specsail/first-mate`); `AGENT_MODEL_MANAGE` applies to headless runs.

## Default model chains

First entry is the default; later entries are fallbacks when a model or provider is unavailable. The provider prefix is `opencode/` except where noted.

| Role | Chain |
|---|---|
| First Mate (`manage`) | `gpt-6-luna` → `deepseek-v4.1-flash` → `mimo-v2.6-flash`\* → `claude-sonnet-5-5` → `gemini-3.8-flash` → `glm-5.3-flash` → `qwen3.8-flash` |
| Scout (`understand`) | `claude-opus-5-5` → `gpt-6.1-sol` → `gemini-4-argon` → `kimi-k3` → `grok-4.7` → `deepseek-v4-pro` → `mimo-v2.6-pro`\* → `glm-5.3` → `qwen3.8-max` |
| Navigator (`plan`) | `claude-opus-5-5` → `gpt-6.1-sol` → `kimi-k3` → `grok-4.7` → `deepseek-v4-pro` → `mimo-v2.6-pro`\* → `gemini-4-argon` → `glm-5.3` → `qwen3.8-max` |
| Quartermaster (`acceptance-tests`) | `claude-sonnet-5-5` → `gpt-6-luna` → `gemini-4-argon` → `deepseek-v4.1-flash` → `mimo-v2.6-flash`\* → `glm-5.3-flash` → `qwen3.8-flash` |
| Hands (`implement`) | `claude-sonnet-5-5` → `gpt-6-luna` → `deepseek-v4.1-flash` → `mimo-v2.6-flash`\* → `gemini-4-argon` → `glm-5.3-flash` → `qwen3.8-flash` |
| Bosun (`review`) | `gpt-6.1-sol` → `claude-opus-5-5` → `kimi-k3` → `grok-4.7` → `deepseek-v4-pro` → `mimo-v2.6-pro`\* → `gemini-4-argon` → `glm-5.3` → `qwen3.8-max` |
| Clerk (`ship`) | `mimo-v2.6-flash`\* → `deepseek-v4.1-flash` → `claude-haiku-5-5` → `gpt-6-luna` → `glm-5.3-flash` → `gemini-3.8-flash` → `qwen3.8-flash` |

\* `mimo-*` models live under the `opencode-go` provider (`opencode-go/mimo-v2.6-flash`, `opencode-go/mimo-v2.6-pro`).

## Independence and permissions

- **Review:** Bosun uses a different model family than Hands and skips families already used by Hands. If no other family is available, the Captain must accept a same-family review and the caveat is recorded in `review.md`.
- **Permissions:** Bosun can only write `review.md` and `tasks.md`. Hands cannot edit `specs/**` or `tests/acceptance/**`. Quartermaster can only write acceptance tests. Clerk cannot edit source, specs, or tests. Adjust these in the agent files if your project layout differs.

## Notes

- `specsail init --adapter opencode` never overwrites existing files. To change a default, edit the agent file or set the role in `.specsail/agents.env`.
- `.specsail/agents.env` is gitignored, so committed model defaults live in these agent files; use `agents.env` for local choices.
- The adapter is optional. SpecSail's conversational workflow works with any agent tool that reads Markdown.
