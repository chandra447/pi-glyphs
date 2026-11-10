/**
 * pi-glyphs configuration.
 *
 * Resolution order (later wins): defaults → config file → `PI_GLYPHS_PRESET`
 * env var → `--glyphs <preset>` CLI flag. The file lives next to Pi's other
 * agent state, so a preset survives restarts without touching settings.json.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { isPreset, PRESETS, type Preset } from "./glyphs.ts";

export interface Config {
	/** Icon vocabulary. */
	preset: Preset;
	/** Draw a glyph in front of every tool call row. */
	tools: boolean;
	/** Mark the first line of each user turn with a cursor glyph. */
	rail: boolean;
	/** Prefix the collapsed-thinking label with a glyph. */
	thinking: boolean;
	/** Use the preset's spinner frames for the working indicator. */
	spinner: boolean;
}

export const DEFAULTS: Config = {
	preset: "unicode",
	tools: true,
	rail: true,
	thinking: true,
	spinner: true,
};

export const FEATURES = ["tools", "rail", "thinking", "spinner"] as const;
export type Feature = (typeof FEATURES)[number];

export function isFeature(value: unknown): value is Feature {
	return typeof value === "string" && (FEATURES as readonly string[]).includes(value);
}

let cachedPath: string | undefined;

export function configPath(): string {
	if (cachedPath) return cachedPath;
	let dir: string;
	try {
		dir = getAgentDir();
	} catch {
		dir = join(process.env.HOME ?? process.cwd(), ".pi", "agent");
	}
	cachedPath = join(dir, "pi-glyphs.json");
	return cachedPath;
}

function coerce(raw: unknown): Partial<Config> {
	if (!raw || typeof raw !== "object") return {};
	const record = raw as Record<string, unknown>;
	const patch: Partial<Config> = {};
	if (isPreset(record.preset)) patch.preset = record.preset;
	for (const feature of FEATURES) {
		const value = record[feature];
		if (typeof value === "boolean") patch[feature] = value;
	}
	return patch;
}

/** Read the config file, ignoring an unreadable or malformed file. */
export function loadConfig(): Config {
	const config: Config = { ...DEFAULTS };
	try {
		const raw = readFileSync(configPath(), "utf8");
		Object.assign(config, coerce(JSON.parse(raw)));
	} catch {
		// No config yet (or an unreadable one): defaults are fine.
	}
	const fromEnv = process.env.PI_GLYPHS_PRESET;
	if (isPreset(fromEnv)) config.preset = fromEnv;
	return config;
}

/** Apply a CLI flag value, if it names a preset. */
export function withFlag(config: Config, flag: unknown): Config {
	if (isPreset(flag)) return { ...config, preset: flag };
	return config;
}

export function saveConfig(config: Config): { ok: true } | { ok: false; error: string } {
	const path = configPath();
	try {
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, "utf8");
		return { ok: true };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : String(error) };
	}
}

export function describePreset(preset: Preset): string {
	return `${preset} (${PRESETS.indexOf(preset) + 1}/${PRESETS.length})`;
}
