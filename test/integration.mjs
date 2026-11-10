/**
 * Integration check: drive Pi's REAL ToolExecutionComponent (and the real
 * built-in renderers) with pi-glyphs wrapping them, then measure every emitted
 * line. This is the test that proves the wrapper survives contact with Pi
 * rather than with a fake renderer.
 *
 *   node test/integration.mjs
 *
 * Needs Pi installed. Resolution order: PI_GLYPHS_PI_DIR, `npm root -g`, then
 * the usual Homebrew/npm global prefixes.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function findPi() {
	const candidates = [
		process.env.PI_GLYPHS_PI_DIR,
		(() => {
			try {
				return join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "@earendil-works/pi-coding-agent");
			} catch {
				return undefined;
			}
		})(),
		"/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent",
		"/usr/local/lib/node_modules/@earendil-works/pi-coding-agent",
	].filter(Boolean);
	for (const candidate of candidates) {
		const entry = join(candidate, "dist/bundle/index.js");
		if (existsSync(entry)) return { dir: candidate, entry };
	}
	throw new Error("Pi not found — set PI_GLYPHS_PI_DIR to @earendil-works/pi-coding-agent");
}

function findTui() {
	const candidates = [
		join(process.cwd(), "node_modules/@earendil-works/pi-tui/dist/index.js"),
		"/opt/homebrew/lib/node_modules/@earendil-works/pi-tui/dist/index.js",
	];
	for (const candidate of candidates) if (existsSync(candidate)) return candidate;
	return undefined;
}

const pi = findPi();
const tuiEntry = findTui();

const { ToolExecutionComponent, initTheme, createReadToolDefinition, createBashToolDefinition, createEditToolDefinition } =
	await import(pi.entry);
const { visibleWidth } = tuiEntry
	? await import(tuiEntry)
	: await import("@earendil-works/pi-tui");

process.env.PI_GLYPHS_AGENT_DIR = mkdtempSync(join(tmpdir(), "pi-glyphs-int-"));

const { default: extension } = await import("../src/extension.ts");
const { IconPrefix } = await import("../src/render.ts");
const { glyphFor } = await import("../src/glyphs.ts");

initTheme("dark");

const captured = [];
let command;
const host = {
	registerToolRenderer: (resolver) => captured.push(resolver),
	registerMarkdownTransformer() {},
	registerCommand: (_name, definition) => (command = definition),
	registerFlag() {},
	getFlag: () => undefined,
	on: (event, handler) => (host.handlers ??= new Map()).set(event, handler),
};
extension(host);

const ui = {
	requestRender() {},
	notify() {},
	theme: { fg: (_token, text) => text },
	setHiddenThinkingLabel() {},
	setWorkingIndicator() {},
	getToolsExpanded: () => false,
	setToolsExpanded() {},
};
const ctx = { mode: "tui", hasUI: true, ui };
const cwd = process.cwd();

const resolve = (name, base) => captured[0](name, () => base);
const makeRow = (toolName, args, definition) =>
	new ToolExecutionComponent(toolName, `call-${toolName}`, args, {}, definition, ui, cwd);

const stripAnsi = (line) => line.replace(/\u001b\[[0-9;]*m/g, "");
const firstVisible = (lines) => lines.find((line) => stripAnsi(line).trim().length > 0) ?? "";

function assertFits(component, width, label) {
	const lines = component.render(width);
	for (const [index, line] of lines.entries()) {
		const measured = visibleWidth(line);
		assert.ok(measured <= width, `${label}: line ${index} is ${measured} cols in a ${width}-col box`);
	}
	return lines;
}

const results = [];
const check = (label, fn) => {
	try {
		fn();
		results.push(`PASS  ${label}`);
	} catch (error) {
		results.push(`FAIL  ${label}\n        ${error.message}`);
	}
};

// ── 1. a read row across widths ────────────────────────────────────────────
const readDefinition = resolve("read", createReadToolDefinition(cwd));
const readRow = makeRow("read", { path: "src/app.ts" }, readDefinition);
for (const width of [80, 60, 40, 24, 16]) {
	check(`read call fits ${width} cols`, () => {
		assert.ok(assertFits(readRow, width, `read/${width}`).length > 0);
	});
}
check("read call carries the TypeScript glyph", () => {
	const line = firstVisible(readRow.render(80));
	assert.ok(line.includes(glyphFor("unicode", "ts")), `line=${JSON.stringify(line)}`);
});
check("read call keeps Pi's own text", () => {
	const line = firstVisible(readRow.render(80));
	assert.ok(stripAnsi(line).includes("read"), `line=${JSON.stringify(stripAnsi(line))}`);
	assert.ok(stripAnsi(line).includes("src/app.ts"));
});
check("glyph dropped on a 16-col box", () => {
	const line = firstVisible(readRow.render(16));
	assert.ok(!line.includes(glyphFor("unicode", "ts")), `line=${JSON.stringify(stripAnsi(line))}`);
});

// ── 2. the result phase re-renders the call row ───────────────────────────
check("read result renders, fits, keeps the glyph", () => {
	readRow.updateResult({ content: [{ type: "text", text: "line1\nline2" }], details: {} });
	assertFits(readRow, 80, "read/result");
	assert.ok(firstVisible(readRow.render(80)).includes(glyphFor("unicode", "ts")));
});

// ── 3. bash: long output, then an error ───────────────────────────────────
const bashDefinition = resolve("bash", createBashToolDefinition(cwd));
check("bash row with 200 lines of output fits", () => {
	const row = makeRow("bash", { command: "seq 1 200" }, bashDefinition);
	assertFits(row, 80, "bash/call");
	row.updateResult({
		content: [{ type: "text", text: Array.from({ length: 200 }, (_, i) => `line ${i}`).join("\n") }],
		details: {},
	});
	assertFits(row, 80, "bash/result");
});
check("bash error row fits and turns the glyph red", () => {
	const row = makeRow("bash", { command: "false" }, bashDefinition);
	row.updateResult({ content: [{ type: "text", text: "exit code: 1" }], details: {}, isError: true });
	const lines = assertFits(row, 80, "bash/error");
	assert.ok(lines.length > 0);
});

// ── 4. edit with a diff ───────────────────────────────────────────────────
check("edit row with a diff fits", () => {
	const row = makeRow("edit", { path: "src/app.ts", oldText: "a", newText: "b" }, resolve("edit", createEditToolDefinition(cwd)));
	assertFits(row, 80, "edit/call");
	const diff = ["--- a/src/app.ts", "+++ b/src/app.ts", ...Array.from({ length: 40 }, (_, i) => `+row ${i}`)].join("\n");
	row.updateResult({ content: [{ type: "text", text: "ok" }], details: { diff } });
	assertFits(row, 80, "edit/result");
});

// ── 5. a tool that is not registered yet (MCP before its server connects) ─
check("unregistered tool keeps its name and fits", () => {
	const row = makeRow("mcp__fs__read_file", { path: "x.ts" }, resolve("mcp__fs__read_file", undefined));
	const lines = assertFits(row, 80, "mcp/call");
	assert.ok(stripAnsi(firstVisible(lines)).includes("mcp__fs__read_file"), `line=${JSON.stringify(stripAnsi(firstVisible(lines)))}`);
	row.updateResult({ content: [{ type: "text", text: "content" }], details: {} });
	assertFits(row, 80, "mcp/result");
});

// ── 6. hostile arguments ──────────────────────────────────────────────────
check("null args do not throw", () => {
	assertFits(makeRow("mystery", null, resolve("mystery", undefined)), 80, "null-args");
});
check("array args do not throw", () => {
	assertFits(makeRow("mystery", [1, 2, 3], resolve("mystery", undefined)), 80, "array-args");
});

// ── 7. an existing row repaints with the new preset ───────────────────────
check("existing row picks up a preset switch", () => {
	const row = makeRow("read", { path: "src/app.ts" }, readDefinition);
	const before = firstVisible(row.render(80));
	command.handler("nerd", ctx);
	const after = firstVisible(row.render(80));
	assert.ok(before.includes(glyphFor("unicode", "ts")), `before=${JSON.stringify(stripAnsi(before))}`);
	assert.ok(after.includes(glyphFor("nerd", "ts")), `after=${JSON.stringify(stripAnsi(after))}`);
	command.handler("unicode", ctx);
});

// ── 8. framing decisions pass through ────────────────────────────────────
check('renderShell "self" and renderResult pass through', () => {
	const base = {
		renderShell: "self",
		renderCall: () => ({ render: () => ["custom shell"], invalidate() {} }),
		renderResult: () => ({ render: () => ["custom result"], invalidate() {} }),
	};
	const definition = captured[0]("custom", () => base);
	assert.equal(definition.renderShell, "self");
	assert.equal(definition.renderResult, base.renderResult);
});

// ── 9. the reuse contract: a tool gets its own component back ────────────
check("base renderer never receives the pi-glyphs wrapper", () => {
	let seen;
	const base = {
		renderCall: (_args, _theme, context) => {
			seen = context.lastComponent;
			return { render: () => ["row"], invalidate() {} };
		},
	};
	const row = makeRow("reuse", {}, captured[0]("reuse", () => base));
	row.render(80);
	row.setExpanded(true);
	assert.ok(!(seen instanceof IconPrefix), "lastComponent must not be the wrapper");
});

// ── 10. every preset fits the real box ───────────────────────────────────
check("all four presets fit 80 cols", () => {
	for (const preset of ["nerd", "unicode", "emoji", "ascii"]) {
		command.handler(preset, ctx);
		assertFits(makeRow("read", { path: "src/app.ts" }, readDefinition), 80, `preset/${preset}`);
	}
});

console.log(results.join("\n"));
const failures = results.filter((line) => line.startsWith("FAIL"));
console.log(`\n${results.length - failures.length}/${results.length} integration checks passed (pi ${pi.dir})`);
process.exitCode = failures.length === 0 ? 0 : 1;
