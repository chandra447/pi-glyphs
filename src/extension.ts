/**
 * pi-glyphs — icon presets for Pi's terminal UI.
 *
 * Four vocabularies (`nerd`, `unicode`, `emoji`, `ascii`) applied to the tool
 * rows, the working spinner, the collapsed-thinking label and the user-turn rail.
 *
 * Usage:
 *   /glyphs                  pick a preset
 *   /glyphs nerd             switch preset directly
 *   /glyphs tools on|off     glyph in front of tool rows
 *   /glyphs rail on|off      cursor glyph on user turns
 *   /glyphs thinking on|off  glyph on the collapsed thinking label
 *   /glyphs spinner on|off   preset spinner frames
 *   /glyphs reset            back to defaults
 *   /glyphs status           show the active configuration
 *
 * Flags/env: `--glyphs <preset>`, `PI_GLYPHS_PRESET=<preset>`.
 */

import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
	type Config,
	DEFAULTS,
	FEATURES,
	type Feature,
	isFeature,
	describePreset,
	loadConfig,
	saveConfig,
	withFlag,
} from "./config.ts";
import { isPreset, PRESET_HINTS, PRESET_LABELS, PRESETS, type Preset } from "./glyphs.ts";
import { presetSample, registerToolGlyphs } from "./render.ts";
import { applyRail, applySurface } from "./surface.ts";

const USAGE = [
	"/glyphs                 pick a preset",
	"/glyphs nerd|unicode|emoji|ascii",
	"/glyphs tools|rail|thinking|spinner [on|off]",
	"/glyphs reset | status",
].join("\n");

function summary(config: Config): string {
	const flags = FEATURES.map((feature) => `${feature}:${config[feature] ? "on" : "off"}`).join("  ");
	return `pi-glyphs — ${config.preset} (${PRESET_LABELS[config.preset]})\n${flags}`;
}

export default function (pi: ExtensionAPI) {
	let config: Config = loadConfig();
	const current = () => config;

	// `setHiddenThinkingLabel` rebuilds every assistant block in the transcript, and
	// `setWorkingIndicator` should not steal the spinner back from another extension
	// on every model turn, so the surface is re-applied only when its inputs change.
	let appliedSurface: string | undefined;

	const refreshSurface = (ctx: ExtensionContext): void => {
		const key = `${config.preset}|${config.thinking}|${config.spinner}|${ctx.ui?.theme?.name ?? ""}`;
		if (key === appliedSurface) return;
		appliedSurface = key;
		applySurface(ctx, config);
	};

	const persist = (ctx: ExtensionCommandContext): void => {
		const result = saveConfig(config);
		if (!result.ok) ctx.ui.notify(`pi-glyphs: could not save ${result.error}`, "warning");
	};

	const commit = (ctx: ExtensionCommandContext, patch: Partial<Config>, message: string): void => {
		config = { ...config, ...patch };
		persist(ctx);
		refreshSurface(ctx);
		ctx.ui.notify(message, "info");
	};

	registerToolGlyphs(pi, current);

	if (typeof pi.registerMarkdownTransformer === "function") {
		pi.registerMarkdownTransformer((markdown, context) => applyRail(markdown, context, config), {
			messageTypes: ["user"],
		});
	}

	pi.registerFlag("glyphs", {
		description: "Icon preset for tool rows and the chat surface (nerd | unicode | emoji | ascii)",
		type: "string",
	});

	pi.on("session_start", (_event, ctx) => {
		const flag = pi.getFlag("glyphs");
		if (isPreset(flag)) config = withFlag(config, flag);
		else warnAboutPreset(ctx, flag, "--glyphs", config.preset);
		warnAboutPreset(ctx, process.env.PI_GLYPHS_PRESET, "PI_GLYPHS_PRESET", config.preset);
		refreshSurface(ctx);
	});

	// Frames and the thinking label are pre-coloured strings, so a theme switch
	// (which Pi handles by invalidating components, not by re-running extensions)
	// would leave them on the old accent. Checking per turn is enough, and the
	// key comparison keeps it a no-op when nothing changed.
	pi.on("turn_start", (_event, ctx) => refreshSurface(ctx));

	pi.registerCommand("glyphs", {
		description: "Choose how Pi's tool rows and chat surface are drawn (nerd | unicode | emoji | ascii)",
		handler: async (args, ctx) => {
			const words = args.trim().split(/\s+/).filter(Boolean);
			const [head, tail] = words;

			if (!head) {
				if (ctx.mode !== "tui") {
					ctx.ui.notify(`pi-glyphs — ${config.preset}\n${USAGE}`, "info");
					return;
				}
				const labels = new Map<string, Preset>();
				const options = PRESETS.map((preset) => {
					const label = `${preset.padEnd(8)} ${presetSample(preset)}  ·  ${PRESET_HINTS[preset]}`;
					labels.set(label, preset);
					return label;
				});
				const picked = await ctx.ui.select(`Icon preset (current: ${config.preset})`, options);
				if (!picked) return;
				const preset = labels.get(picked);
				if (preset && preset !== config.preset) {
					commit(ctx, { preset }, `pi-glyphs: ${preset} (${PRESET_LABELS[preset]})`);
				}
				return;
			}

			if (head === "status") {
				ctx.ui.notify(summary(config), "info");
				return;
			}

			if (head === "help" || head === "?") {
				ctx.ui.notify(USAGE, "info");
				return;
			}

			if (head === "reset") {
				config = { ...DEFAULTS };
				persist(ctx);
				refreshSurface(ctx);
				ctx.ui.notify(`pi-glyphs: reset to ${DEFAULTS.preset}`, "info");
				return;
			}

			if (isPreset(head)) {
				if (head === config.preset) {
					ctx.ui.notify(`pi-glyphs: already ${head}`, "info");
					return;
				}
				commit(ctx, { preset: head }, `pi-glyphs: ${head} (${PRESET_LABELS[head]}) — ${describePreset(head)}`);
				return;
			}

			if (isFeature(head)) {
				const next = parseToggle(tail, config[head as Feature]);
				if (next === undefined) {
					ctx.ui.notify(`pi-glyphs: ${head} — expected on|off\n${USAGE}`, "warning");
					return;
				}
				commit(ctx, { [head]: next } as Partial<Config>, `pi-glyphs: ${head} ${next ? "on" : "off"}`);
				return;
			}

			ctx.ui.notify(`pi-glyphs: unknown argument "${head}"\n${USAGE}`, "warning");
		},
	});
}

function warnAboutPreset(ctx: ExtensionContext, value: unknown, source: string, active: Preset): void {
	if (typeof value !== "string" || value.length === 0 || isPreset(value)) return;
	if (!ctx.hasUI) return;
	ctx.ui.notify(`pi-glyphs: ${source} "${value}" is not a preset (${PRESETS.join(" | ")}) — using ${active}`, "warning");
}

function parseToggle(value: string | undefined, currentValue: boolean): boolean | undefined {
	if (!value) return !currentValue;
	const normalized = value.toLowerCase();
	if (["on", "true", "yes", "1", "enable", "enabled"].includes(normalized)) return true;
	if (["off", "false", "no", "0", "disable", "disabled"].includes(normalized)) return false;
	if (["toggle", "flip"].includes(normalized)) return !currentValue;
	return undefined;
}
