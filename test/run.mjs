/**
 * Headless checks for pi-glyphs.
 *
 * Run with: node test/run.mjs
 *
 * The theme and the `pi` object are fakes: this exercises the real renderers,
 * the real glyph tables and the real command handler without a terminal.
 */

import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { visibleWidth } from "@earendil-works/pi-tui";

const agentDir = mkdtempSync(join(tmpdir(), "pi-glyphs-test-"));
process.env.PI_GLYPHS_AGENT_DIR = agentDir;

const { default: extension } = await import("../src/extension.ts");
const { PRESETS, glyphFor, langFromPath, spinnerFrames } = await import("../src/glyphs.ts");
const { toolGlyphKey } = await import("../src/tools.ts");
const { applyRail } = await import("../src/surface.ts");
const { IconPrefix, presetSample } = await import("../src/render.ts");

const ESC = "\u001b[";
const theme = {
	fg(token, text) {
		const code = { accent: 36, dim: 90, error: 31, toolTitle: 1, muted: 2, success: 32, warning: 33 }[token] ?? 39;
		return `${ESC}${code}m${text}${ESC}39m`;
	},
	bold: (text) => `${ESC}1m${text}${ESC}22m`,
};

// ── harness ────────────────────────────────────────────────────────────────
function createHost() {
	const host = {
		toolRenderers: [],
		transformers: [],
		commands: new Map(),
		flags: new Map(),
		handlers: new Map(),
		notifications: [],
		ui: {
			theme,
			select: async (_title, options) => options[0],
			notify: (message) => host.notifications.push(message),
			setHiddenThinkingLabel: (label) => (host.thinkingLabel = label),
			setWorkingIndicator: (options) => (host.workingIndicator = options),
			setToolsExpanded: () => {},
			getToolsExpanded: () => false,
		},
	};
	host.pi = {
		registerToolRenderer: (resolver) => host.toolRenderers.push(resolver),
		registerMarkdownTransformer: (transformer, options) => host.transformers.push({ transformer, options }),
		registerCommand: (name, definition) => host.commands.set(name, definition),
		registerFlag: (name, definition) => host.flags.set(name, definition),
		getFlag: (name) => host.flagValues?.[name],
		on: (event, handler) => host.handlers.set(event, handler),
	};
	host.ctx = { mode: "tui", hasUI: true, ui: host.ui };
	return host;
}

const host = createHost();
extension(host.pi);
assert.equal(host.toolRenderers.length, 1, "one tool renderer registered");
assert.equal(host.transformers.length, 1, "one markdown transformer registered");
assert.deepEqual(host.transformers[0].options.messageTypes, ["user"]);
assert.ok(host.commands.has("glyphs"), "/glyphs command registered");

// ── glyph tables ───────────────────────────────────────────────────────────
const KEYS = [
	"read", "write", "edit", "bash", "search", "folder", "list", "globe", "fetch", "browser", "code",
	"task", "todo", "memory", "mcp", "question", "skill", "agents", "git", "image", "package", "gear",
	"time", "thinking", "success", "error", "warning", "pending", "running", "user", "assistant", "doc",
	"star", "ts", "js", "py", "rs", "go", "java", "c", "cpp", "cs", "rb", "php", "swift", "kt", "sh",
	"html", "css", "json", "yaml", "md", "sql", "docker", "lua", "txt", "env", "toml", "xml", "img",
	"pdf", "zip", "log", "csv", "cfg",
];
for (const preset of PRESETS) {
	for (const key of KEYS) {
		const glyph = glyphFor(preset, key);
		assert.equal(typeof glyph, "string", `${preset}/${key} defined`);
		assert.ok(glyph.length > 0, `${preset}/${key} not empty`);
		if (preset === "ascii") {
			assert.ok(/^[\x20-\x7e]+$/.test(glyph), `ascii/${key} is seven-bit (${JSON.stringify(glyph)})`);
		}
	}
	assert.ok(spinnerFrames(preset).length >= 2, `${preset} spinner`);
}

// ── language detection ─────────────────────────────────────────────────────
const langCases = [
	["src/app.ts", "ts"],
	["a/b/component.tsx", "ts"],
	["main.py", "py"],
	["lib.rs", "rs"],
	["Dockerfile", "docker"],
	[".env", "env"],
	["README.md", "md"],
	["data.csv", "csv"],
	["no-extension", undefined],
	["archive.tar.gz", "zip"],
];
for (const [path, expected] of langCases) {
	assert.equal(langFromPath(path), expected, `langFromPath(${path})`);
}

// ── tool → glyph ───────────────────────────────────────────────────────────
assert.equal(toolGlyphKey("read", { path: "src/app.ts" }), "ts", "read borrows the language icon");
assert.equal(toolGlyphKey("read", { path: "src/app.ts" }), "ts", "stable");
assert.equal(toolGlyphKey("read", { path: "notes.unknown" }), "read", "unknown language falls back");
assert.equal(toolGlyphKey("bash", { command: "ls" }), "bash");
assert.equal(toolGlyphKey("mcp__github__read_file", { path: "x.ts" }), "mcp", "MCP wins over language");
assert.equal(toolGlyphKey("web_search", { query: "x" }), "globe");
assert.equal(toolGlyphKey("subagent", {}), "agents");
assert.equal(toolGlyphKey("todo_write", {}), "todo");
assert.equal(toolGlyphKey("completely_unknown_tool", {}), "gear");
assert.equal(toolGlyphKey("edit", { file_path: "/tmp/x.py" }), "py");

// ── renderer ───────────────────────────────────────────────────────────────
const resolve = (name, base) => host.toolRenderers[0](name, () => (base === null ? undefined : (base ?? baseRenderers)));
const baseRenderers = {
	renderShell: undefined,
	renderCall: (args) => ({ render: () => [`read ${args.path}`, "line two"], invalidate() {} }),
	renderResult: () => ({ render: () => ["result"], invalidate() {} }),
};
const renderers = resolve("read");
assert.equal(typeof renderers.renderCall, "function");
assert.deepEqual(renderers.renderResult, baseRenderers.renderResult, "result renderer untouched");

const fakeContext = {
	args: { path: "src/app.ts" },
	lastComponent: undefined,
	state: {},
	cwd: process.cwd(),
	executionStarted: true,
	argsComplete: true,
	isPartial: false,
	expanded: false,
	showImages: true,
	isError: false,
	durationMs: 12,
	outputPad: 1,
	invalidate() {},
	keyText: () => "",
	keyHint: () => "",
	toolCallId: "t1",
};

const row = renderers.renderCall({ path: "src/app.ts" }, theme, fakeContext);
assert.ok(row instanceof IconPrefix);
const lines = row.render(80);
assert.equal(lines.length, 2);
assert.ok(lines[0].includes("read src/app.ts"), "wrapped line keeps the tool text");
assert.ok(lines[0].startsWith(theme.fg("accent", glyphFor("unicode", "ts"))), "glyph leads the row");
assert.equal(visibleWidth(lines[0]) <= 80, true, "line fits the width");

// every line of an inner component that pads to full width stays inside the box
const padded = {
	render: (width) => [`x`.padEnd(width, " ")],
	invalidate() {},
};
const paddedRow = new IconPrefix(padded, theme, "bash", {}, "success", () => ({ preset: "emoji", tools: true }));
for (const width of [20, 40, 80]) {
	for (const line of paddedRow.render(width)) {
		assert.ok(visibleWidth(line) <= width, `emoji prefix respects width ${width}`);
	}
}

// pending / error phases colour differently
const phaseOf = (context) => {
	const component = renderers.renderCall({ path: "a.ts" }, theme, { ...fakeContext, ...context });
	return component.render(80)[0];
};
assert.ok(phaseOf({ argsComplete: false, isPartial: true }).startsWith(theme.fg("dim", glyphFor("unicode", "ts"))));
assert.ok(phaseOf({ argsComplete: true, isPartial: true }).startsWith(theme.fg("accent", glyphFor("unicode", "ts"))), "HTML export context stays accent");
assert.ok(phaseOf({ isPartial: false, isError: true }).startsWith(theme.fg("error", glyphFor("unicode", "ts"))));

// narrow terminals drop the glyph instead of truncating the row
const narrow = row.render(14);
assert.ok(narrow[0].includes("read"), "glyph dropped below the minimum width");
assert.ok(!narrow[0].includes(glyphFor("unicode", "ts")), "no glyph on narrow rows");

// unknown tools still get a row
const unknown = resolve("completely_unknown_tool", null);
const unknownRow = unknown.renderCall({ foo: 1 }, theme, { ...fakeContext, args: { foo: 1 } });
const unknownLines = unknownRow.render(60);
assert.ok(unknownLines[0].includes("completely_unknown_tool"), "unknown tool name kept");
assert.ok(unknownLines[0].includes("foo=1"), "unknown tool args kept");

// base renderer throwing must not break the row
const throwing = host.toolRenderers[0]("bash", () => ({
	renderCall: () => {
		throw new Error("boom");
	},
}));
const safe = throwing.renderCall({ command: "ls" }, theme, { ...fakeContext, args: { command: "ls" } });
assert.ok(safe.render(60)[0].includes("bash"), "fallback renders when a tool renderer throws");

// ── configuration ──────────────────────────────────────────────────────────
const command = host.commands.get("glyphs");
await command.handler("status", host.ctx);
await command.handler("nerd", host.ctx);
assert.equal(host.notifications.at(-1).includes("nerd"), true, "preset switch reported");
const nerdRow = resolve("bash").renderCall({ command: "ls" }, theme, { ...fakeContext, args: { command: "ls" } });
assert.ok(nerdRow.render(60)[0].includes(glyphFor("nerd", "bash")), "preset switch takes effect at render time");

await command.handler("tools off", host.ctx);
const plainBase = { renderCall: () => ({ render: () => ["bash ls"], invalidate() {} }) };
const noTools = resolve("bash", plainBase).renderCall({ command: "ls" }, theme, { ...fakeContext, args: { command: "ls" } });
assert.deepEqual(noTools.render(60), ["bash ls"], "tools off renders the row unwrapped");
assert.ok(!noTools.render(60)[0].includes(glyphFor("nerd", "bash")), "tools off hides glyphs");

await command.handler("tools on", host.ctx);
await command.handler("rail off", host.ctx);
assert.equal(applyRail("hello", { messageType: "user" }, { preset: "nerd", rail: false, tools: true, thinking: true, spinner: true }), "hello");
await command.handler("rail on", host.ctx);
await command.handler("reset", host.ctx);
await command.handler("bogus", host.ctx);
assert.ok(host.notifications.at(-1).includes("unknown argument"), "unknown argument reported");

// session_start applies the CLI flag and the surface
host.flagValues = { glyphs: "emoji" };
host.handlers.get("session_start")({ type: "session_start", reason: "startup" }, host.ctx);
assert.ok(String(host.workingIndicator?.frames?.[0]).includes("🌑"), "emoji spinner frames applied");
assert.equal(visibleWidth(host.thinkingLabel) > 0, true, "thinking label set");

// ── markdown rail ──────────────────────────────────────────────────────────
const cfg = { preset: "nerd", rail: true, tools: true, thinking: true, spinner: true };
const rail = (markdown, messageType = "user") => applyRail(markdown, { messageType }, cfg);
assert.equal(rail("plain question"), `${glyphFor("nerd", "user")} plain question`);
assert.equal(rail("\n\nplain question"), `\n\n${glyphFor("nerd", "user")} plain question`);
assert.equal(rail("# heading"), "# heading", "headings untouched");
assert.equal(rail("> quote"), "> quote", "quotes untouched");
assert.equal(rail("```ts\ncode\n```"), "```ts\ncode\n```", "fences untouched");
assert.equal(rail("- item"), "- item", "lists untouched");
assert.equal(rail("1. item"), "1. item", "ordered lists untouched");
assert.equal(rail("| a | b |"), "| a | b |", "tables untouched");
assert.equal(rail("plain question", "assistant"), "plain question", "assistant untouched");

// ── picker samples fit ─────────────────────────────────────────────────────
for (const preset of PRESETS) {
	const sample = presetSample(preset);
	assert.ok(sample.length > 0);
	assert.ok(visibleWidth(sample) < 60, `${preset} sample stays short`);
}

console.log("pi-glyphs: all checks passed");
