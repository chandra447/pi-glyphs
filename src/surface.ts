/**
 * The non-tool half of the look: the working indicator, the collapsed-thinking
 * label, and the cursor rail on user turns.
 *
 * Pi gives extensions no hook for the user/assistant message *components*, but it
 * does run Markdown transformers on their content, so the rail is a display-only
 * Markdown prefix. It bails out on anything where a prefix would change meaning
 * (headings, lists, quotes, fences, tables, HTML, math).
 */

import type { ExtensionContext, MarkdownTransformContext } from "@earendil-works/pi-coding-agent";
import type { Config } from "./config.ts";
import { glyphFor, spinnerFrames } from "./glyphs.ts";

/** Lines whose meaning a leading glyph would change. */
const INDENTED_CODE = /^(?:\t| {4})/;

const STRUCTURAL_LINE = /^(?:#{1,6}\s|>|```|~~~|\||[-*+]\s|\d+[.)]\s|!\[|\[[^\]]*\]:|<|\$\$|:::|[-*_]{3,}\s*$)/;

function firstContentLine(lines: string[]): number {
	return lines.findIndex((line) => line.trim().length > 0);
}

/**
 * Prefix the first line of a user turn with the preset's cursor glyph.
 * Returns the Markdown unchanged whenever the prefix would be unsafe.
 */
export function applyRail(markdown: string, context: MarkdownTransformContext, config: Config): string {
	if (!config.rail) return markdown;
	if (context.messageType !== "user") return markdown;

	const glyph = glyphFor(config.preset, "user");
	if (!glyph) return markdown;

	const lines = markdown.split("\n");
	const index = firstContentLine(lines);
	if (index === -1) return markdown;
	// A tab or four spaces make an indented code block; a glyph would turn it back
	// into prose. Test the raw line, not the trimmed one.
	if (INDENTED_CODE.test(lines[index])) return markdown;
	if (STRUCTURAL_LINE.test(lines[index].trim())) return markdown;

	lines[index] = `${glyph} ${lines[index]}`;
	return lines.join("\n");
}

/** Apply the working indicator and thinking label for the active preset. */
export function applySurface(ctx: ExtensionContext, config: Config): void {
	if (ctx.mode !== "tui") return;

	const ui = ctx.ui;

	if (typeof ui.setHiddenThinkingLabel === "function") {
		if (config.thinking) {
			const glyph = glyphFor(config.preset, "thinking");
			ui.setHiddenThinkingLabel(glyph ? `${glyph} Thinking…` : undefined);
		} else {
			ui.setHiddenThinkingLabel();
		}
	}

	if (typeof ui.setWorkingIndicator === "function") {
		if (config.spinner) {
			const frames = spinnerFrames(config.preset).map((frame) => ui.theme.fg("accent", frame));
			ui.setWorkingIndicator({ frames, intervalMs: 110 });
		} else {
			ui.setWorkingIndicator();
		}
	}
}
