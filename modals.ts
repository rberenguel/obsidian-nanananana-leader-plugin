import { App, SuggestModal, Modal, Command, Notice, Setting } from "obsidian";
import { CommandMapping, Hotkey } from "./types";
import { fromKeyEvent, toDisplayString } from "./utils";

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

		if (event.key === "Escape") {
			this.close();
			return;
		}

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
			return;
		}

		this.sequence.push(hotkey);
		this.updateDisplay();
	}
}

// NEW: Modal for creating and editing a command mapping (potentially a chain)
export class MappingEditModal extends Modal {
	private mapping: CommandMapping;
	private triggerDisplay: HTMLElement;

	constructor(
		app: App,
		originalMapping: CommandMapping,
		private onSave: (mapping: CommandMapping) => boolean, // Return true on success to close
	) {
		super(app);
		// Deep copy to avoid modifying the original until saved
		this.mapping = JSON.parse(JSON.stringify(originalMapping));
	}

	onOpen() {
		this.contentEl.empty();
		this.titleEl.setText(this.mapping.commands.length > 0 ? "Edit Mapping" : "New Mapping");
		
		this.drawTriggerSetting();
		this.drawCommandsSetting();

		new Setting(this.contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Save")
					.setCta()
					.onClick(() => {
						if (this.mapping.trigger.length === 0) {
							new Notice("Trigger sequence cannot be empty.");
							return;
						}
						if (this.mapping.commands.length === 0) {
							new Notice("Command chain cannot be empty.");
							return;
						}
						if (this.onSave(this.mapping)) {
							this.close();
						}
					}),
			);
	}
    
    private redraw() {
        const { contentEl, titleEl } = this;
        const scroll = contentEl.scrollTop;
        this.onOpen();
        contentEl.scrollTop = scroll;
    }
    
	private drawTriggerSetting() {
		new Setting(this.contentEl)
			.setName("Trigger Sequence")
			.setDesc("The key sequence to trigger the command(s).")
			.then(setting => {
				this.triggerDisplay = setting.controlEl.createDiv({ cls: "leader-hotkey-display" });
				this.updateTriggerDisplay();

				setting.addButton(btn => btn
					.setButtonText("Change")
					.onClick(() => {
						new KeyRecorderModal(
							this.app,
							"Press new trigger sequence",
							(hotkeySequence) => {
								this.mapping.trigger = hotkeySequence;
								this.updateTriggerDisplay();
							}
						).open();
					})
				);
			});
	}
    
    private updateTriggerDisplay() {
        this.triggerDisplay.empty();
        const kbd = this.triggerDisplay.createEl("kbd");
        kbd.setText(this.mapping.trigger.length > 0 ? toDisplayString(this.mapping.trigger) : "Not set");
    }

	private drawCommandsSetting() {
		const setting = new Setting(this.contentEl)
			.setName("Chained Commands")
			.setDesc("The commands to execute in order.");
			
		const commandListEl = this.contentEl.createDiv();
		this.mapping.commands.forEach((command, index) => {
			new Setting(commandListEl)
                .setName(command.name)
                .addExtraButton(btn => btn
                    .setIcon("trash")
                    .setTooltip("Remove command")
                    .onClick(() => {
                        this.mapping.commands.splice(index, 1);
                        this.redraw();
                    })
                );
		});

		setting.addButton((btn) =>
				btn
					.setButtonText("Add Command")
					.onClick(() => {
						new SearchableCommandModal(this.app, (command) => {
							this.mapping.commands.push({
								id: command.id,
								name: command.name,
							});
							this.redraw();
						}).open();
					})
			);
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
			row.createEl("td").setText(mapping.commands.map(c => c.name).join(' → '));
		});
	}
}