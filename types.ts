// Represents a single key press, e.g., 'Mod + Shift + K'
export interface Hotkey {
	modifiers: string[]; // e.g., ["Mod", "Shift"]
	key: string; // e.g., "K"
}

// Represents a standard Obsidian command.
export interface ObsidianCommand {
	type: "obsidian";
	id: string;
	name: string;
}

// Represents our new virtual command to open a file.
export interface OpenFileCommand {
	type: "open-file";
	path: string; // Vault path to the file
	name: string; // Display name, e.g., "Open file: Inbox"
}

// A command can now be one of the defined types.
export type MappedCommand = ObsidianCommand | OpenFileCommand;

// Maps a trigger hotkey sequence to one or more commands
export interface CommandMapping {
	trigger: Hotkey[];
	commands: MappedCommand[];
}

// The complete settings object for the plugin
export interface LeaderSettings {
	leaderKey: Hotkey;
	mappings: CommandMapping[];
	timeout: number; // Timeout in ms to auto-exit leader mode
	multiKeyTimeout: number; // Timeout in ms to wait for a subsequent key in a sequence
}

export const DEFAULT_SETTINGS: LeaderSettings = {
	leaderKey: { modifiers: ["Mod"], key: " " }, // Default to Cmd/Ctrl + Space
	mappings: [],
	timeout: 2000,
	multiKeyTimeout: 1000,
};
