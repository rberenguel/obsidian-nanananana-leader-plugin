import { Hotkey } from "./types";
import { Platform } from "obsidian";

const MODIFIER_SORT_ORDER: { [key: string]: number } = {
	Mod: 1,
	Ctrl: 2,
	Meta: 3,
	Alt: 4,
	Shift: 5,
};

// Converts a KeyboardEvent into our Hotkey format
export function fromKeyEvent(event: KeyboardEvent): Hotkey {
	const modifiers = new Set<string>();
	if (event.ctrlKey) modifiers.add("Ctrl");
	if (event.metaKey) modifiers.add("Meta");
	if (event.altKey) modifiers.add("Alt");
	if (event.shiftKey) modifiers.add("Shift");

	// Normalize to "Mod"
	if (Platform.isMacOS ? modifiers.has("Meta") : modifiers.has("Ctrl")) {
		modifiers.delete("Meta");
		modifiers.delete("Ctrl");
		modifiers.add("Mod");
	}

	// Ignore modifier-only keypresses
	const key = event.key;
	if (["Control", "Shift", "Alt", "Meta", "Hyper"].includes(key)) {
		return { modifiers: [], key: "" };
	}

	return {
		modifiers: Array.from(modifiers).sort(
			(a, b) => MODIFIER_SORT_ORDER[a] - MODIFIER_SORT_ORDER[b],
		),
		key: key.toUpperCase(),
	};
}

// Creates a human-readable string like "Mod + Shift + K"
export function toDisplayString(hotkey: Hotkey): string {
	if (!hotkey.key) return "None";
	const parts = [...hotkey.modifiers];
	// Obsidian uses symbols for Mod and Shift on Mac
	if (Platform.isMacOS) {
		if (parts.includes("Mod")) parts[parts.indexOf("Mod")] = "⌘";
		if (parts.includes("Shift")) parts[parts.indexOf("Shift")] = "⇧";
		if (parts.includes("Alt")) parts[parts.indexOf("Alt")] = "⌥";
	}
	parts.push(hotkey.key === " " ? "Space" : hotkey.key);
	return parts.join(" + ");
}

// Compares two Hotkey objects for equality
export function areHotkeysEqual(h1: Hotkey, h2: Hotkey): boolean {
	if (h1.key !== h2.key) return false;
	if (h1.modifiers.length !== h2.modifiers.length) return false;
	const mod1 = new Set(h1.modifiers);
	for (const mod of h2.modifiers) {
		if (!mod1.has(mod)) return false;
	}
	return true;
}
