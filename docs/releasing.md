# Releasing SpecSail

SpecSail publishes from GitHub Actions using npm **trusted publishing** (OIDC). No npm token is stored in the repository or in Actions secrets, and every tarball gets a signed provenance attestation.

## One-time setup (npmjs.com)

1. Sign in to npmjs.com with 2FA.
2. Open the `specsail` package → **Settings** → **Trusted publisher**.
3. Choose **GitHub Actions** and enter:
   - Repository: `dseija/specsail`
   - Workflow filename: `release.yml`
   - Environment: `npm`
4. Allow **publish** as well as stage publish (new configurations default to staging only).
5. Save. The configuration expires after 48 hours if no publish validates it, so release soon after.

The same setup can be created from the CLI (it prompts for 2FA):

```sh
npm trust github specsail --file release.yml --repo dseija/specsail --env npm --allow-publish
```

The workflow file must keep that exact name, and the job must keep `environment: npm`; otherwise npm rejects the OIDC identity. Once trusted publishing works, npm recommends switching the package's publishing access to **Require two-factor authentication and disallow tokens**.

## Release procedure

```sh
make release VERSION=0.2.0
```

The helper checks a clean `main` that matches `origin/main`, requires a `## 0.2.0` heading in `CHANGELOG.md`, runs `make verify`, bumps `package.json`/lockfile, commits `chore: release 0.2.0`, tags `v0.2.0`, and pushes both.

Pushing the tag starts `.github/workflows/release.yml`, which:

1. installs with `npm ci` and runs `make verify`;
2. checks that the tag matches the package version;
3. runs `npm publish --access public --provenance` using the runner's OIDC identity;
4. creates the GitHub release from the matching `CHANGELOG.md` section.

Watch it with `gh run watch`, then verify:

```sh
npm view specsail version
npm audit signatures
gh release view v0.2.0
```

## Fallback: publish from a workstation

If Actions is unavailable, publish manually with your npm 2FA:

```sh
npm login
npm publish --access public
```

Manual publishes are not provenance-attested. Prefer the tag workflow.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `E403` / `E404` from the publish step | Trusted publisher misconfigured: wrong repository, workflow filename, or environment. |
| `EOTP` | The configuration allows staging only. Enable publish on npmjs.com, or approve the staged version with `npm stage approve <id>`. |
| Tag/version mismatch | `package.json` and the pushed tag disagree; bump the version, commit, and tag together. |
| Configuration expired | Trusted publisher configs expire after 48 hours without a successful publish; recreate it. |
| Workflow did not run | The tag was not pushed, or the workflow file was renamed. The npm configuration references `release.yml` by name. |
