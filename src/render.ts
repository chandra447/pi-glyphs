/**
 * Tool-row rendering.
 *
 * pi-glyphs never replaces a tool's own renderer: it wraps whatever the tool
 * (or another extension) already renders and prepends a glyph to the first
 * visible line. That keeps every piece of information Pi shows — paths, diffs,
 * exit codes, expand hints — and still gives every row a signature icon, which
 * is the part oh-my-pi's look is actually made of.
 *
 * Width handling: the glyph's real column width is measured with
 * `visibleWidth()` (Nerd Font glyphs, emoji and zero-width joiners all differ),
 * the wrapped component is laid out in the remaining columns, and the glyph is
 * dropped entirely when the terminal is too narrow to afford it.
 */

import { Text, visibleWidth, type Component } from "@earendil-works/pi-tui";
import type { ExtensionAPI, Theme } from "@earendil-works/pi-coding-agent";
import type { Config } from "./config.ts";
import { glyphFor } from "./glyphs.ts";
import { toolGlyphKey } from "./tools.ts";

/** Minimum columns the wrapped row keeps for itself before the glyph is dropped. */
const MIN_CONTENT_WIDTH = 12;

type Phase = "pending" | "success" | "error";

const COLLAPSED_ARG_CHARS = 100;

export class IconPrefix implements Component {
	readonly child: Component;
	private readonly theme: Theme;
	/** Resolved once per row update — the tool→language lookup must not run every frame. */
	private readonly glyphKey: ReturnType<typeof toolGlyphKey>;
	private readonly phase: Phase;
	private readonly config: () => Config;

	constructor(
		child: Component,
		theme: Theme,
		toolName: string,
		args: unknown,
		phase: Phase,
		config: () => Config,
	) {
		this.child = child;
		this.theme = theme;
		this.glyphKey = toolGlyphKey(toolName, args);
		this.phase = phase;
		this.config = config;
	}

	render(width: number): string[] {
		const prefix = this.prefixText();
		if (!prefix) return this.child.render(width);

		const prefixWidth = visibleWidth(prefix);
		if (prefixWidth + MIN_CONTENT_WIDTH > width) return this.child.render(width);

		const lines = this.child.render(Math.max(1, width - prefixWidth));
		const index = lines.findIndex((line) => visibleWidth(line) > 0);
		if (index === -1) return lines;

		const out = lines.slice();
		out[index] = prefix + out[index];
		return out;
	}

	invalidate(): void {
		this.child.invalidate();
	}

	/**
	 * Pi wraps tool rows in a MouseRegion, which dispatches to the row component
	 * before falling back to expand-on-click. Without this forward, a tool whose
	 * own call component is clickable or hoverable would lose its handler.
	 */
	handleMouse(event: unknown): unknown {
		const child = this.child as Component & { handleMouse?: (event: unknown) => unknown };
		return child.handleMouse?.(event);
	}

	private prefixText(): string {
		const config = this.config();
		if (!config.tools) return "";
		const glyph = glyphFor(config.preset, this.glyphKey);
		if (!glyph) return "";
		return `${this.theme.fg(this.color(), glyph)} `;
	}

	private color(): "accent" | "dim" | "error" {
		if (this.phase === "error") return "error";
		if (this.phase === "pending") return "dim";
		return "accent";
	}
}

/** Mirror of Pi's own fallback call renderer, kept so tools without one stay readable. */
function fallbackCall(toolName: string, args: unknown, theme: Theme, expanded: boolean): Component {
	const header = theme.fg("toolTitle", theme.bold(toolName));
	if (args === null || args === undefined) return new Text(header, 0, 0);

	const entries: Array<[string, unknown]> =
		typeof args === "object" && !Array.isArray(args) ? Object.entries(args as Record<string, unknown>) : [["args", args]];
	if (entries.length === 0) return new Text(header, 0, 0);

	if (expanded) {
		const lines = entries.map(([key, value]) => {
			const text = typeof value === "string" ? value : (JSON.stringify(value, null, 2) ?? String(value));
			return `  ${key}: ${text.replace(/\r/g, "").split("\n").join("\n    ")}`;
		});
		return new Text(`${header}\n${theme.fg("muted", lines.join("\n"))}`, 0, 0);
	}

	const pairs = entries
		.map(([key, value]) => `${key}=${JSON.stringify(value) ?? String(value)}`.replace(/\r?\n/g, " "))
		.join(" ");
	const preview =
		pairs.length > COLLAPSED_ARG_CHARS ? `${pairs.slice(0, COLLAPSED_ARG_CHARS - 3)}...` : pairs;
	return new Text(`${header} ${theme.fg("muted", preview)}`, 0, 0);
}

/**
 * Register the glyph rail for every tool — built-in, extension and MCP, including
 * tools that are not registered yet in a resumed session.
 */
export function registerToolGlyphs(pi: ExtensionAPI, getConfig: () => Config): void {
	if (typeof pi.registerToolRenderer !== "function") return;

	pi.registerToolRenderer((toolName, next) => {
		const base = next();
		const baseCall = base?.renderCall;

		return {
			// Keep the tool's own framing decision; only the call line is decorated.
			renderShell: base?.renderShell,
			renderResult: base?.renderResult,
			renderCall(args, theme, context) {
				// `lastComponent` is our wrapper from the previous frame — hand the tool
				// back its own component so it can update in place.
				const previous =
					context.lastComponent instanceof IconPrefix ? context.lastComponent.child : context.lastComponent;

				let inner: Component | undefined;
				if (baseCall) {
					try {
						inner = baseCall(args, theme, { ...context, lastComponent: previous });
					} catch {
						inner = undefined;
					}
				}
				inner ??= fallbackCall(toolName, args, theme, context.expanded);

				// Keyed off argument streaming, not result streaming: HTML exports build
				// their context with `isPartial: true`, which would dim every icon there.
				const phase: Phase = context.isError ? "error" : context.argsComplete ? "success" : "pending";
				return new IconPrefix(inner, theme, toolName, args, phase, getConfig);
			},
		};
	});
}

/** A one-line sample of a preset, used by `/glyphs` so the choice is visible before it is made. */
export function presetSample(preset: Config["preset"]): string {
	const pick = (key: Parameters<typeof glyphFor>[1]) => glyphFor(preset, key);
	const cell = (key: Parameters<typeof glyphFor>[1], label: string) => `${pick(key)} ${label}`;
	return [cell("bash", "bash"), cell("read", "read"), cell("edit", "edit"), cell("search", "grep")].join("  ");
}
