// Represents a single key press, e.g., 'Mod + Shift + K'
export interface Hotkey {
	modifiers: string[]; // e.g., ["Mod", "Shift"]
	key: string; // e.g., "K"
}

// Maps a trigger hotkey to a command ID
export interface CommandMapping {
	trigger: Hotkey;
	commandId: string;
	commandName: string; // Store name for easier display
}

// The complete settings object for the plugin
export interface LeaderSettings {
	leaderKey: Hotkey;
	mappings: CommandMapping[];
	timeout: number; // Timeout in ms to auto-exit leader mode
}

export const DEFAULT_SETTINGS: LeaderSettings = {
	leaderKey: { modifiers: ["Mod"], key: " " }, // Default to Cmd/Ctrl + Space
	mappings: [],
	timeout: 2000,
};
