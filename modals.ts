import { App, SuggestModal, Modal, Command, Notice, Setting } from "obsidian";
import { CommandMapping, Hotkey } from "./types";
import { fromKeyEvent, toDisplayString, areSequencesEqual } from "./utils";

// Modal for searching and selecting an Obsidian command
export class SearchableCommandModal extends SuggestModal<Command> {
	constructor(app: App, private onChoose: (command: Command) => void) {
		super(app);
		this.setPlaceholder("Search for an Obsidian command...");
	}

	getSuggestions(query: string): Command[] {
		const normalizedQuery = query.toLowerCase();
		const commands: Command[] = Object.values(
			(this.app as any).commands.commands,
		);

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

// Modal for recording a sequence of hotkeys
export class KeyRecorderModal extends Modal {
	private eventListener = (event: KeyboardEvent) =>
		this.handleKeyPress(event);
	private sequence: Hotkey[] = [];
	private sequenceDisplayEl: HTMLElement;

	constructor(
		app: App,
		private title: string,
		private onComplete: (hotkey: Hotkey[]) => void,
	) {
		super(app);
	}

	onOpen() {
		this.contentEl.empty();
		this.titleEl.setText(this.title);
		this.contentEl.createEl("p", {
			text: "Press the desired key sequence, then click Save. Press Escape to cancel.",
		});
		this.sequenceDisplayEl = this.contentEl.createEl("div", {
			cls: "leader-hotkey-display",
		});
		
		new Setting(this.contentEl)
			.addButton(btn => btn
				.setButtonText("Save")
				.setCta()
				.onClick(() => this.save()))
			.addExtraButton(btn => btn
				.setIcon("trash")
				.setTooltip("Delete last key")
				.onClick(() => this.deleteLast()));

		this.updateDisplay();
		document.addEventListener("keydown", this.eventListener, {
			capture: true,
		});
	}

	onClose() {
		document.removeEventListener("keydown", this.eventListener, {
			capture: true,
		});
	}

	private save() {
		if (this.sequence.length > 0) {
			this.onComplete(this.sequence);
			this.close();
		} else {
			new Notice("Cannot save an empty sequence.");
		}
	}

	private deleteLast() {
		this.sequence.pop();
		this.updateDisplay();
	}

	private updateDisplay() {
		this.sequenceDisplayEl.empty();
		if (this.sequence.length === 0) {
			this.sequenceDisplayEl.setText("Waiting for key(s)...");
		} else {
			const kbd = this.sequenceDisplayEl.createEl("kbd");
			kbd.setText(toDisplayString(this.sequence));
		}
	}

	private handleKeyPress(event: KeyboardEvent) {
		event.preventDefault();
		event.stopPropagation();

		// Escape is the only special key, used to close the modal.
		if (event.key === "Escape") {
			this.close();
			return;
		}

		// Prevent modifier-only keypresses from being recorded.
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

		const hotkey = fromKeyEvent(event);
		if (!hotkey.key) {
			// This can happen if fromKeyEvent has logic for other invalid keys
			return;
		}

		this.sequence.push(hotkey);
		this.updateDisplay();
	}
}

export class HelpModal extends Modal {
	constructor(app: App, private mappings: CommandMapping[]) {
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