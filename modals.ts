import { App, SuggestModal, Modal, Command, Notice } from "obsidian";
import { CommandMapping, Hotkey } from "./types";
import { fromKeyEvent, toDisplayString } from "./utils";

// Modal for searching and selecting an Obsidian command
export class SearchableCommandModal extends SuggestModal<Command> {
	constructor(
		app: App,
		private onChoose: (command: Command) => void,
	) {
		super(app);
		this.setPlaceholder("Search for an Obsidian command...");
	}

	getSuggestions(query: string): Command[] {
		const normalizedQuery = query.toLowerCase();
		const commands: Command[] = Object.values(
			(this.app as any).commands.commands,
		); // <-- Important: Get the raw, unfiltered list

		return commands.filter((cmd) =>
			cmd.name.toLowerCase().includes(normalizedQuery),
		);
	}
	renderSuggestion(command: Command, el: HTMLElement): void {
		el.setText(command.name);
	}

	onChooseSuggestion(command: Command): void {
		this.onChoose(command);
	}
}

// Modal for recording a single hotkey
export class KeyRecorderModal extends Modal {
	private eventListener = (event: KeyboardEvent) =>
		this.handleKeyPress(event);

	constructor(
		app: App,
		private title: string,
		private onComplete: (hotkey: Hotkey) => void,
	) {
		super(app);
	}

	onOpen() {
		this.contentEl.empty();
		this.titleEl.setText(this.title);
		this.contentEl.setText("Press the desired key combination now...");
		document.addEventListener("keydown", this.eventListener, {
			capture: true,
		});
	}

	onClose() {
		document.removeEventListener("keydown", this.eventListener, {
			capture: true,
		});
	}

	handleKeyPress(event: KeyboardEvent) {
		event.preventDefault();
		event.stopPropagation();

		// Check if the key itself is just a modifier. If so, do nothing and wait for the next key.
		console.log(event.key);
		const isModifierOnly = [
			"Control",
			"Shift",
			"Alt",
			"Meta",
			"Hyper",
			"CapsLock",
		].includes(event.key);
		if (isModifierOnly) {
			return;
		}

		// Now that we know it's a "real" keypress, process it.
		const hotkey = fromKeyEvent(event);

		// Safety check
		if (!hotkey.key) {
			new Notice("Invalid hotkey.");
			return;
		}

		this.onComplete(hotkey);
		this.close();
	}
}

export class HelpModal extends Modal {
	constructor(
		app: App,
		private mappings: CommandMapping[],
	) {
		super(app);
	}

	onOpen() {
		this.titleEl.setText("Leader Hotkeys Help");
		const { contentEl } = this;

		if (this.mappings.length === 0) {
			contentEl.setText("No hotkeys configured.");
			return;
		}

		const table = contentEl.createEl("table");
		const tbody = table.createTBody();
		this.mappings.forEach((mapping) => {
			const row = tbody.createEl("tr");
			const keyCell = row.createEl("td");
			keyCell.createEl("kbd").setText(toDisplayString(mapping.trigger));
			row.createEl("td").setText(mapping.commandName);
		});
	}
}
