# pi-glyphs

Nerd Font, Unicode, emoji and pure-ASCII icon presets for [Pi](https://pi.dev)'s
terminal UI — the look you get from [oh-my-pi](https://github.com/can1357/oh-my-pi),
as a Pi package you can switch on a keypress.

Four surfaces get a glyph:

| Surface | What changes |
|---|---|
| **Tool rows** | every tool call gets its icon: `read src/app.ts` wears the TypeScript mark, `bash` the terminal, `mcp__…` the plug |
| **Working spinner** | preset spinner frames (braille, moon phases, `-\|/`) |
| **Thinking label** | the collapsed-thinking row is prefixed with the preset's brain/lightbulb glyph |
| **User rail** | the first line of each user turn gets the cursor glyph (`❯`) |

Nothing about *behaviour* changes. pi-glyphs never replaces a tool's renderer —
it wraps whatever Pi (or another extension) already draws and prepends a glyph,
so paths, diffs, exit codes and expand hints all survive.

## Install

```bash
# try it for one session
pi -e ~/pi-glyphs

# keep it
pi install ~/pi-glyphs

# from git, later
pi install git:github.com/<you>/pi-glyphs
```

Then `/glyphs` to pick a preset, or `pi --glyphs nerd`.

## Presets

| Preset | Needs | Sample |
|---|---|---|
| `nerd` | a patched Nerd Font | `󰆍 bash` `󰈙 read` `󰈔 edit` `󰍉 grep` |
| `unicode` | any decent font | `❯ bash` `▤ read` `✎ edit` `⌕ grep` |
| `emoji` | a colour terminal | `💻 bash` `📖 read` `✏️ edit` `🔍 grep` |
| `ascii` | nothing at all | `sh bash` `[R] read` `[E] edit` `/ grep` |

`unicode` is the default because it renders without font patching. If you have a
Nerd Font, `nerd` is the one that looks like oh-my-pi.

Language icons cover TypeScript, JavaScript, Python, Rust, Go, Java, C/C++/C#,
Ruby, PHP, Swift, Kotlin, shell, HTML, CSS, JSON, YAML, Markdown, SQL, Docker,
Lua, plain text, env/toml/ini, XML/SVG, images, PDFs, archives, logs and CSV.
Anything unknown falls back to a generic file glyph.

## Commands

```
/glyphs                       pick a preset (interactive, samples rendered in the list)
/glyphs nerd                  switch directly: nerd | unicode | emoji | ascii
/glyphs tools [on|off]        glyph in front of tool rows
/glyphs rail [on|off]         cursor glyph on user turns
/glyphs thinking [on|off]     glyph on the collapsed thinking label
/glyphs spinner [on|off]      preset spinner frames
/glyphs reset                 back to defaults
/glyphs status                show the active configuration
```

## Configuration

Resolution order, later wins:

1. defaults (`unicode`, all surfaces on)
2. `~/.pi/agent/pi-glyphs.json`
3. `PI_GLYPHS_PRESET` environment variable
4. `--glyphs <preset>` CLI flag

`/glyphs` writes the file, so a choice survives restarts:

```json
{
  "preset": "nerd",
  "tools": true,
  "rail": true,
  "thinking": true,
  "spinner": true
}
```

## How it works

- `pi.registerToolRenderer()` composes with Pi's own renderer per tool, including
  MCP tools and tools that are not registered yet in a resumed session. The
  wrapper hands the tool back its previous component so in-place updates keep
  working, and falls back to a name + args row when a tool has no renderer of
  its own.
- The glyph is measured with `visibleWidth()` — emoji and Nerd Font glyphs are
  not one cell wide — and the wrapped row is laid out in the remaining columns.
  Below ~15 columns the glyph is dropped instead of eating the row.
- The icon is resolved *during* render, so switching preset repaints every row
  still on screen without touching the session. In `tuiMode: "regular"` the lines
  the terminal already scrolled away cannot be rewritten by anything, Pi included.
- Tools with no renderer of their own (for example an MCP tool before its server
  connects) get `name` + a compact argument preview, the same density Pi uses for
  its own fallback; expanding the row shows every argument.
- Colours come from Pi's semantic tokens through the live theme handle, so the
  glyphs follow the session's theme: `accent` for a tool, `dim` while its
  arguments are still streaming, `error` on failure, `muted` for a fallback row's
  arguments, `accent` for the spinner. The thinking label inherits Pi's own
  `thinkingText` because Pi styles that string itself. `test/integration.mjs`
  asserts a glyph recolours when the session theme switches.
- The user rail is a display-only Markdown transform. It refuses to touch
  headings, lists, quotes, fences, tables, HTML, math or horizontal rules,
  where a leading glyph would change what Markdown means.

### Known limits

Pi exposes no hook for the *user/assistant message components* themselves, so
message framing (backgrounds, borders, per-message headers) still comes from your
theme; pi-glyphs adds the rail and the tool-row iconography on top. A full
oh-my-pi message treatment would need a Pi-side hook, not a package.

The rail is also monochrome on purpose: Pi paints user Markdown with
`userMessageText`, so a colour of its own is not expressible from an extension.
Everything else — tool glyphs, spinner, thinking label — takes its colour from the
active theme and is never hard-coded.

## Development

```bash
# headless width math needs a pi-tui copy that ships dist/
npm install --no-save @earendil-works/pi-tui@0.80.2

node test/run.mjs           # glyph tables, width safety, renderer, command, rail
node test/integration.mjs   # drives Pi's real ToolExecutionComponent (needs Pi installed)
node scripts/preview.mjs    # print the four presets in your terminal
```

`test/integration.mjs` is the authority: it measures against the Pi you actually
run, and it will catch a width-table change that the standalone suite (pinned to
an older pi-tui) cannot. Point `PI_GLYPHS_PI_DIR` at
`node_modules/@earendil-works/pi-coding-agent` if Pi is not in a global prefix.

The package ships no build step: `src/*.ts` is loaded directly by Pi.

## Publishing

```bash
# bump version, then
npm publish
pi install npm:pi-glyphs
```

Fill in `repository`, `homepage` and `author` in `package.json` first, and add a
`pi.image` (a screenshot of the four presets) so the pi.dev gallery has something
to show.

## Credits

Icon vocabulary and the `unicode | nerd | ascii` preset idea come from
[oh-my-pi](https://github.com/can1357/oh-my-pi) (MIT). `emoji` is this package's
addition.

## License

MIT
