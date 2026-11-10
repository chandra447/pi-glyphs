# Changelog

## [0.1.0]

- Four icon presets — `nerd`, `unicode`, `emoji`, `ascii` — covering tool rows,
  the working spinner, the collapsed-thinking label and the user-turn rail.
- Tool glyphs resolve per call: file-shaped tools borrow their target's language
  icon, MCP tools take the plug, unknown tools fall back to a generic mark.
- `/glyphs` picker with rendered samples, plus per-surface toggles.
- Config file at `~/.pi/agent/pi-glyphs.json`, `PI_GLYPHS_PRESET`, `--glyphs`.
- Width-safe wrapping: glyph width measured with `visibleWidth()`, dropped on
  terminals too narrow to afford it.
