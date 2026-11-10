/**
 * Visual smoke test: prints the same four tool rows in every preset.
 *
 *   node scripts/preview.mjs [preset]
 *
 * Useful when picking glyphs or checking alignment in a real terminal — Nerd
 * Font glyphs only look right where a patched font is installed.
 */

import { Text } from "@earendil-works/pi-tui";

const { PRESETS, glyphFor } = await import("../src/glyphs.ts");
const { toolGlyphKey } = await import("../src/tools.ts");
const { IconPrefix } = await import("../src/render.ts");

const theme = {
	fg(token, text) {
		const code = { accent: 36, dim: 90, error: 31 }[token] ?? 39;
		return `\u001b[${code}m${text}\u001b[39m`;
	},
	bold: (text) => `\u001b[1m${text}\u001b[22m`,
};

const ROWS = [
	["bash", { command: "npm test" }, "$ npm test", "success"],
	["read", { path: "src/app.ts" }, "read src/app.ts", "success"],
	["edit", { path: "src/glyphs.ts" }, "edit src/glyphs.ts", "success"],
	["bash", { command: "npm run lint" }, "$ npm run lint", "error"],
];

const requested = process.argv[2];
const presets = requested ? PRESETS.filter((preset) => preset === requested) : PRESETS;

for (const preset of presets) {
	const config = () => ({ preset, tools: true, rail: true, thinking: true, spinner: true });
	console.log(`\n  ${preset}\n`);
	for (const [tool, args, line, phase] of ROWS) {
		// Mirror how a Pi tool renderer draws its call line.
		const inner = new Text(theme.fg("toolTitle", theme.bold(line)), 0, 0);
		const row = new IconPrefix(inner, theme, tool, args, phase, config);
		console.log(`  ${row.render(72).join("\n  ")}`);
	}
	const sample = ["ts", "py", "rs", "md"].map((key) => `${glyphFor(preset, key)} x.${key}`).join("  ");
	console.log(`\n  languages: ${sample}\n`);
}
