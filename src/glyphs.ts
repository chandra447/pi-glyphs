/**
 * Glyph vocabulary for pi-glyphs.
 *
 * The preset names and the vocabulary itself follow oh-my-pi's symbol presets
 * (`unicode`, `nerd`, `ascii`) so a user can move between the two tools without
 * relearning the icon language; `emoji` is pi-glyphs' addition.
 *
 * Every row is `[nerd, unicode, emoji, ascii]`:
 *   - nerd     Nerd Fonts (Font Awesome / Devicons / Material Design codepoints)
 *   - unicode  plain Unicode that every terminal with a decent font can draw
 *   - emoji    colour emoji (two cells wide, still width-corrected at render time)
 *   - ascii    seven-bit only, for terminals, tmux setups and CI logs
 */

export const PRESETS = ["nerd", "unicode", "emoji", "ascii"] as const;
export type Preset = (typeof PRESETS)[number];

export function isPreset(value: unknown): value is Preset {
	return typeof value === "string" && (PRESETS as readonly string[]).includes(value);
}

export const PRESET_LABELS: Record<Preset, string> = {
	nerd: "Nerd Font",
	unicode: "Unicode",
	emoji: "Emoji",
	ascii: "ASCII",
};

export const PRESET_HINTS: Record<Preset, string> = {
	nerd: "patched Nerd Font required",
	unicode: "no font patching needed",
	emoji: "colour terminal",
	ascii: "works anywhere",
};

export type LangKey =
	| "ts"
	| "js"
	| "py"
	| "rs"
	| "go"
	| "java"
	| "c"
	| "cpp"
	| "cs"
	| "rb"
	| "php"
	| "swift"
	| "kt"
	| "sh"
	| "html"
	| "css"
	| "json"
	| "yaml"
	| "md"
	| "sql"
	| "docker"
	| "lua"
	| "txt"
	| "env"
	| "toml"
	| "xml"
	| "img"
	| "pdf"
	| "zip"
	| "log"
	| "csv"
	| "cfg";

export type GlyphKey =
	// tools and verbs
	| "read"
	| "write"
	| "edit"
	| "bash"
	| "search"
	| "folder"
	| "list"
	| "globe"
	| "fetch"
	| "browser"
	| "code"
	| "task"
	| "todo"
	| "memory"
	| "mcp"
	| "question"
	| "skill"
	| "agents"
	| "git"
	| "image"
	| "package"
	| "gear"
	| "time"
	| "thinking"
	// status
	| "success"
	| "error"
	| "warning"
	| "pending"
	| "running"
	// chat surface
	| "user"
	| "assistant"
	| "doc"
	| "star"
	// languages / file kinds
	| LangKey;

type Row = readonly [nerd: string, unicode: string, emoji: string, ascii: string];

const COLUMN: Record<Preset, 0 | 1 | 2 | 3> = { nerd: 0, unicode: 1, emoji: 2, ascii: 3 };

/** `[nerd, unicode, emoji, ascii]` — comments name the Nerd Fonts glyph. */
const GLYPHS: Record<GlyphKey, Row> = {
	// ── tools and verbs ────────────────────────────────────────────────────
	read: ["\uf02d", "▤", "📖", "[R]"], // nf-fa-book
	write: ["\uea7f", "✎", "📝", "[W]"], // nf-cod-new_file
	edit: ["\uea73", "✎", "✏️", "[E]"], // nf-cod-edit
	bash: ["\uebca", "❯", "💻", "sh"], // nf-cod-terminal — ASCII says "sh" because Pi's line already starts with "$"
	search: ["\uf002", "⌕", "🔍", "/"], // nf-fa-search
	folder: ["\uf115", "📁", "📁", "[D]"], // nf-fa-folder_open_o
	list: ["\uf03a", "≡", "📋", "[L]"], // nf-fa-list
	globe: ["\uf0ac", "🌐", "🌐", "@"], // nf-fa-globe
	fetch: ["\uf01a", "⤓", "⬇️", "v"], // nf-fa-cloud_download
	browser: ["\uf0ac", "🧭", "🧭", "[b]"], // nf-fa-globe
	code: ["\uf121", "⌨", "🧩", "<>"], // nf-fa-code
	task: ["\uf0ea", "⇶", "📋", "[T]"], // nf-fa-clipboard
	todo: ["\uf046", "☑", "✅", "[x]"], // nf-fa-check_square_o
	memory: ["\uf1c0", "🧠", "🧠", "[M]"], // nf-fa-database
	mcp: ["\uf1e6", "🔌", "🔌", "[p]"], // nf-fa-plug
	question: ["\uf059", "?", "❓", "[?]"], // nf-fa-question_circle
	skill: ["\uf0eb", "✦", "✨", "*"], // nf-fa-lightbulb_o
	agents: ["\uf0c0", "👥", "👥", "[u]"], // nf-fa-users
	git: ["\uf1d3", "⎇", "🌿", "git:"], // nf-fa-git_square
	image: ["\uf03e", "🖼", "🖼️", "[i]"], // nf-fa-image
	package: ["\uf487", "📦", "📦", "[P]"], // nf-fa-cube
	gear: ["\uf013", "⚙", "⚙️", "[g]"], // nf-fa-gear
	time: ["\uf017", "⏱", "⏱️", "[t]"], // nf-fa-clock_o
	thinking: ["\uee9c", "◌", "🧠", "[~]"], // nf-fa-brain

	// ── status ─────────────────────────────────────────────────────────────
	success: ["\uf00c", "✔", "✅", "[+]"], // nf-fa-check
	error: ["\uf00d", "✘", "❌", "[-]"], // nf-fa-times
	warning: ["\uf071", "⚠", "⚠️", "[!]"], // nf-fa-exclamation_triangle
	pending: ["\uf254", "⏳", "⏳", "[ ]"], // nf-fa-hourglass_half
	running: ["\uf110", "⟳", "🔄", "[~]"], // nf-fa-spinner

	// ── chat surface ───────────────────────────────────────────────────────
	user: ["\uf054", "❯", "💬", ">"], // nf-fa-chevron_right
	assistant: ["\uf0eb", "✻", "🤖", "[A]"], // nf-fa-lightbulb_o
	doc: ["\uf0f6", "📄", "📄", "[d]"], // nf-fa-file_text_o
	star: ["\uf005", "✦", "⭐", "*"], // nf-fa-star

	// ── languages / file kinds (devicons + omp's unicode fallbacks) ────────
	ts: ["\ue628", "🟦", "🟦", "ts"], // nf-dev-typescript
	js: ["\ue60c", "🟨", "🟨", "js"], // nf-dev-javascript
	py: ["\ue606", "🐍", "🐍", "py"], // nf-dev-python
	rs: ["\ue7a8", "🦀", "🦀", "rs"], // nf-dev-rust
	go: ["\ue627", "🐹", "🐹", "go"], // nf-dev-go
	java: ["\ue738", "☕", "☕", "java"], // nf-dev-java
	c: ["\ue61e", "Ⓒ", "🔵", "c"], // nf-dev-c
	cpp: ["\ue61d", "➕", "🟣", "cpp"], // nf-dev-cplusplus
	cs: ["\ue7b2", "♯", "🟪", "cs"], // nf-dev-csharp
	rb: ["\ue791", "💎", "💎", "rb"], // nf-dev-ruby
	php: ["\ue608", "🐘", "🐘", "php"], // nf-dev-php
	swift: ["\ue755", "🕊", "🕊️", "swift"], // nf-dev-swift
	kt: ["\ue634", "🅺", "🟫", "kt"], // nf-dev-kotlin
	sh: ["\ue795", "💻", "💻", "sh"], // nf-dev-shell
	html: ["\ue736", "🌐", "🌐", "html"], // nf-dev-html5
	css: ["\ue749", "🎨", "🎨", "css"], // nf-dev-css3
	json: ["\ue60b", "🧾", "🧾", "json"], // nf-dev-json
	yaml: ["\ue615", "📋", "📋", "yaml"], // nf-dev-config
	md: ["\ue609", "📝", "📝", "md"], // nf-dev-markdown
	sql: ["\ue706", "🗄", "🗄️", "sql"], // nf-dev-database
	docker: ["\ue7b0", "🐳", "🐳", "docker"], // nf-dev-docker
	lua: ["\ue620", "🌙", "🌙", "lua"], // nf-dev-lua
	txt: ["\ue612", "🗒", "📄", "txt"], // nf-dev-text
	env: ["\ue615", "🔧", "🔧", "env"], // nf-dev-config
	toml: ["\ue615", "🧾", "🧾", "toml"], // nf-dev-config
	xml: ["\u{f05c0}", "⟨⟩", "📐", "xml"], // nf-md-xml
	img: ["\u{f021f}", "🖼", "🖼️", "img"], // nf-md-file_image_outline
	pdf: ["\u{f0226}", "📕", "📕", "pdf"], // nf-md-file_pdf_box
	zip: ["\uf187", "🗜", "🗜️", "zip"], // nf-fa-archive
	log: ["\u{f0331}", "📜", "📜", "log"], // nf-md-script_text_outline
	csv: ["\u{f021b}", "📑", "📊", "csv"], // nf-md-file_table_outline
	cfg: ["\ue615", "⚙", "⚙️", "cfg"], // nf-dev-config
};

export function glyphFor(preset: Preset, key: GlyphKey): string {
	return GLYPHS[key]?.[COLUMN[preset]] ?? "";
}

/** Spinner frames per preset. `ascii` stays bracketed so the column width holds. */
const SPINNERS: Record<Preset, string[]> = {
	nerd: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
	unicode: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
	emoji: ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"],
	ascii: ["-", "\\", "|", "/"],
};

export function spinnerFrames(preset: Preset): string[] {
	return SPINNERS[preset] ?? SPINNERS.unicode;
}

const EXTENSION_LANG: Record<string, LangKey> = {
	ts: "ts",
	tsx: "ts",
	mts: "ts",
	cts: "ts",
	js: "js",
	jsx: "js",
	mjs: "js",
	cjs: "js",
	py: "py",
	pyi: "py",
	ipynb: "py",
	rs: "rs",
	go: "go",
	java: "java",
	c: "c",
	h: "c",
	cpp: "cpp",
	cc: "cpp",
	cxx: "cpp",
	hpp: "cpp",
	hh: "cpp",
	hxx: "cpp",
	cs: "cs",
	rb: "rb",
	php: "php",
	swift: "swift",
	kt: "kt",
	kts: "kt",
	sh: "sh",
	bash: "sh",
	zsh: "sh",
	fish: "sh",
	ps1: "sh",
	html: "html",
	htm: "html",
	css: "css",
	scss: "css",
	sass: "css",
	less: "css",
	json: "json",
	jsonc: "json",
	json5: "json",
	lock: "json",
	yaml: "yaml",
	yml: "yaml",
	md: "md",
	markdown: "md",
	mdx: "md",
	sql: "sql",
	lua: "lua",
	txt: "txt",
	text: "txt",
	env: "env",
	toml: "toml",
	xml: "xml",
	svg: "xml",
	png: "img",
	jpg: "img",
	jpeg: "img",
	gif: "img",
	webp: "img",
	bmp: "img",
	ico: "img",
	avif: "img",
	pdf: "pdf",
	zip: "zip",
	gz: "zip",
	tar: "zip",
	tgz: "zip",
	xz: "zip",
	bz2: "zip",
	zst: "zip",
	"7z": "zip",
	log: "log",
	csv: "csv",
	tsv: "csv",
	ini: "cfg",
	conf: "cfg",
	cfg: "cfg",
	properties: "cfg",
};

const FILENAME_LANG: Record<string, GlyphKey> = {
	dockerfile: "docker",
	"docker-compose.yml": "docker",
	"docker-compose.yaml": "docker",
	makefile: "cfg",
	"cmakelists.txt": "cfg",
	".gitignore": "git",
	".gitattributes": "git",
	".npmrc": "cfg",
	".zshrc": "sh",
	".bashrc": "sh",
	".env": "env",
	".env.local": "env",
	".env.example": "env",
};

/** Map a file path to its language icon, if the path has a known kind. */
export function langFromPath(path: string): GlyphKey | undefined {
	const file = path.split(/[\\/]/).pop()?.toLowerCase();
	if (!file) return undefined;
	const byName = FILENAME_LANG[file];
	if (byName) return byName;
	const dot = file.lastIndexOf(".");
	if (dot <= 0) return undefined;
	return EXTENSION_LANG[file.slice(dot + 1)];
}

