# Publishing pi-glyphs

A Pi package is *just an npm package or git repo* with a manifest Pi reads. There
is no `pi publish` command and no registry of its own — Pi installs from npm, git
or a local path, and the [gallery](https://pi.dev/packages) indexes npm packages
that carry the `pi-package` keyword.

Everything below was run against this repo and Pi 1.5.2; the commands are the
verified ones, not a guess.

## What makes this directory a Pi package

```json
{
  "name": "pi-glyphs",
  "keywords": ["pi-package"],
  "pi": { "extensions": ["./src/extension.ts"] },
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*",
    "@earendil-works/pi-tui": "*"
  }
}
```

| Piece | Why |
|---|---|
| `pi.extensions` | explicit entry point; without it Pi discovers `extensions/`, `skills/`, `prompts/`, `themes/` by convention |
| `keywords: ["pi-package"]` | the only thing that makes the npm package eligible for the pi.dev gallery |
| `peerDependencies` + `*` | `pi-coding-agent` and `pi-tui` are host-provided. Putting them in `dependencies` makes Pi warn: a second physical copy breaks the extension module mapping |
| no build step | `src/*.ts` is loaded by jiti at install time; there is no `dist` to publish |
| `CHANGELOG.md` | Pi shows entries newer than the last seen version after an update |
| `pi.image` / `pi.video` | optional gallery previews, relative to the package root |

## Route 1 — git (works today, no npm account)

```bash
pi install git:github.com/chandra447/pi-glyphs          # tracks the default branch
pi install git:github.com/chandra447/pi-glyphs@v0.1.0   # pinned to a tag or commit
pi install https://github.com/chandra447/pi-glyphs      # URL form, treated as git
pi -e git:github.com/chandra447/pi-glyphs               # one session, no settings change
```

Verified: `pi -e git:github.com/chandra447/pi-glyphs` clones into
`~/.pi/agent/tmp/extensions/…`, installs, and loads the extension.

`pi update --extensions` reconciles a git install with the configured ref; a tag
or commit pin never moves.

## Route 2 — npm (what the gallery lists)

One-time, interactive, and the only step that cannot be automated from a script:

```bash
npm login                      # or: npm login --auth-type=web
npm whoami                     # must print your username
```

Then, from the repo root:

```bash
npm test                       # unit + integration suites must pass
npm pack --dry-run             # confirm the published file list (13 files, ~22 kB)
npm publish --access public
```

Verify the artifact before advertising it — the tarball, not the working tree:

```bash
npm pack                                  # pi-glyphs-0.1.0.tgz
mkdir -p /tmp/check && tar -xzf pi-glyphs-0.1.0.tgz -C /tmp/check
pi --no-session -e /tmp/check/package -p --no-tools "Reply with exactly: OK"
```

Then consumers install with:

```bash
pi install npm:pi-glyphs            # latest
pi install npm:pi-glyphs@0.1.0      # pinned (an exact version is never re-checked)
```

The `pi-package` keyword makes it appear at <https://pi.dev/packages>; no
submission form is involved. Adding `pi.image` to `package.json` gives the listing
a preview.

## Route 3 — local checkout (development)

```bash
pi -e ~/pi-glyphs         # one session
pi install ~/pi-glyphs    # persists a local path in settings.json
```

A local package's dependencies are your responsibility (Pi does not install them),
and it is loaded from the path without copying — so an edit plus `/reload` is
enough to iterate.

## Release checklist

1. `npm test` and `npm run typecheck` clean.
2. Bump `version` in `package.json`; add a `## [x.y.z]` section to `CHANGELOG.md`.
3. `npm pack --dry-run` — no stray files, `src/` complete.
4. `git tag vX.Y.Z && git push --tags`.
5. `npm publish --access public`.
6. `pi update --extensions` in a session that already has it installed, and check
   that the version heading shows up in the update notice.

## Gotchas

- **Do not add `@earendil-works/pi-*` to `dependencies`.** Pi detects it and warns.
- **`files` controls what consumers get.** `test/` and `scripts/` are shipped so the
  README's dev commands work after an npm install; `node_modules/` is not.
- **Version pins are honoured.** `npm:pi-glyphs@0.1.0` and a git tag are never
  re-resolved; only a floating spec is.
- **Install failures are non-fatal.** If npm is unreachable at startup Pi warns,
  skips that package's resources and retries on the next start or `/reload`.
