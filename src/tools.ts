/**
 * Which glyph a tool row wears.
 *
 * File-shaped tools (read / write / edit and friends) borrow their target's
 * language icon — `read src/server.ts` gets the TypeScript mark instead of a
 * generic file — because that is the one piece of information the row already
 * carries.
 */

import { type GlyphKey, langFromPath } from "./glyphs.ts";

const EXACT: Record<string, GlyphKey> = {
	read: "read",
	write: "write",
	edit: "edit",
	multiedit: "edit",
	apply_patch: "edit",
	patch: "edit",
	notebookedit: "edit",
	bash: "bash",
	powershell: "bash",
	shell: "bash",
	terminal: "bash",
	ls: "folder",
	list: "folder",
	listdir: "folder",
	find: "search",
	glob: "search",
	grep: "search",
	search: "search",
	ripgrep: "search",
	web_search: "globe",
	websearch: "globe",
	web_fetch: "fetch",
	webfetch: "fetch",
	fetch: "fetch",
	http: "fetch",
	browse: "browser",
	browser: "browser",
	playwright: "browser",
	task: "task",
	subagent: "agents",
	agent: "agents",
	todo: "todo",
	todowrite: "todo",
	todoread: "todo",
	memory: "memory",
	skill: "skill",
	question: "question",
	ask_user_question: "question",
	codemode: "code",
	eval: "code",
	exec: "code",
	image: "image",
	screenshot: "image",
	doc: "doc",
};

const RULES: ReadonlyArray<readonly [RegExp, GlyphKey]> = [
	[/^mcp[_.:]/, "mcp"],
	[/memory/, "memory"],
	[/todo|checklist|tasklist/, "todo"],
	[/skill/, "skill"],
	[/subagent|agent/, "agents"],
	[/browser|puppeteer|selenium/, "browser"],
	[/fetch|download|http|curl/, "fetch"],
	[/search|grep|find|glob|lookup/, "search"],
	[/git/, "git"],
	[/image|screenshot|photo|ocr/, "image"],
	[/codemode|\beval\b|exec|run_code|repl/, "code"],
	[/read|view|cat|open/, "read"],
	[/write|create|save/, "write"],
	[/edit|replace|patch|modify/, "edit"],
	[/shell|bash|terminal|command/, "bash"],
	[/file|path|fs/, "read"],
];

const PATH_KEYS = [
	"file_path",
	"filePath",
	"path",
	"file",
	"filename",
	"target_file",
	"notebook_path",
	"file_paths",
	"paths",
] as const;

const FILE_TOOLS = new Set<GlyphKey>(["read", "write", "edit"]);

function firstPath(args: unknown): string | undefined {
	if (typeof args === "string") return args;
	if (!args || typeof args !== "object") return undefined;
	const record = args as Record<string, unknown>;
	for (const key of PATH_KEYS) {
		const value = record[key];
		if (typeof value === "string" && value.length > 0) return value;
		if (Array.isArray(value)) {
			const head = value.find((entry): entry is string => typeof entry === "string" && entry.length > 0);
			if (head) return head;
		}
	}
	return undefined;
}

/** Normalise a tool name for matching: `mcp__srv__read` → `mcp__srv__read`, `WebFetch` → `webfetch`. */
function normalizeToolName(name: string): string {
	return name.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function toolGlyphKey(toolName: string, args?: unknown): GlyphKey {
	const name = normalizeToolName(toolName ?? "");

	// MCP tools win over everything: `mcp__srv__read` is an MCP call, not a file read.
	if (/^mcp[_.:]/.test(name)) return "mcp";

	let key = EXACT[name];
	if (!key && name.includes("__")) {
		// `mcp__server__tool` and languageserver-style names: judge the last segment.
		const tail = name.slice(name.lastIndexOf("__") + 2);
		key = EXACT[tail] ?? EXACT[tail.replace(/_/g, "")];
	}
	if (!key) {
		for (const [pattern, candidate] of RULES) {
			if (candidate === "mcp") continue;
			if (pattern.test(name)) {
				key = candidate;
				break;
			}
		}
	}
	if (!key) key = "gear";

	if (FILE_TOOLS.has(key)) {
		const path = firstPath(args);
		const lang = path ? langFromPath(path) : undefined;
		if (lang) return lang;
	}
	return key;
}
