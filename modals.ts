import {
	App,
	SuggestModal,
	Modal,
	Command,
	Notice,
	Setting,
	TFile,
} from "obsidian";
import {
	CommandMapping,
	Hotkey,
	MappedCommand,
	ObsidianCommand,
	OpenFileCommand,
} from "./types";
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

// NEW: Modal for searching and selecting a file from the vault
export class FileSuggestModal extends SuggestModal<TFile> {
	constructor(
		app: App,
		private onChoose: (file: TFile) => void,
	) {
		super(app);
		this.setPlaceholder("Search for a file to open...");
	}

	getSuggestions(query: string): TFile[] {
		const normalizedQuery = query.toLowerCase();
		return this.app.vault
			.getMarkdownFiles()
			.filter((file) =>
				file.path.toLowerCase().includes(normalizedQuery),
			);
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.createEl("div", { text: file.basename });
		el.createEl("small", {
			text: file.path,
			cls: "nav-file-title-content",
		});
	}

	onChooseSuggestion(file: TFile): void {
		this.onChoose(file);
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
			.addButton((btn) =>
				btn
					.setButtonText("Save")
					.setCta()
					.onClick(() => this.save()),
			)
			.addExtraButton((btn) =>
				btn
					.setIcon("trash")
					.setTooltip("Delete last key")
					.onClick(() => this.deleteLast()),
			);

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

// Modal for creating and editing a command mapping (potentially a chain)
export class MappingEditModal extends Modal {
	private mapping: CommandMapping;
	private triggerDisplay: HTMLElement;
	private dragIndex: number | null = null; // To track the item being dragged

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
		this.titleEl.setText(
			this.mapping.commands.length > 0 ? "Edit Mapping" : "New Mapping",
		);

		this.drawTriggerSetting();
		this.drawCommandsSetting();

		new Setting(this.contentEl).addButton((btn) =>
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
		const { contentEl } = this;
		const scroll = contentEl.scrollTop;
		this.onOpen();
		contentEl.scrollTop = scroll;
	}

	private drawTriggerSetting() {
		new Setting(this.contentEl)
			.setName("Trigger Sequence")
			.setDesc("The key sequence to trigger the command(s).")
			.then((setting) => {
				this.triggerDisplay = setting.controlEl.createDiv({
					cls: "leader-hotkey-display",
				});
				this.updateTriggerDisplay();

				setting.addButton((btn) =>
					btn.setButtonText("Change").onClick(() => {
						new KeyRecorderModal(
							this.app,
							"Press new trigger sequence",
							(hotkeySequence) => {
								this.mapping.trigger = hotkeySequence;
								this.updateTriggerDisplay();
							},
						).open();
					}),
				);
			});
	}

	private updateTriggerDisplay() {
		this.triggerDisplay.empty();
		const kbd = this.triggerDisplay.createEl("kbd");
		kbd.setText(
			this.mapping.trigger.length > 0
				? toDisplayString(this.mapping.trigger)
				: "Not set",
		);
	}

	private drawCommandsSetting() {
		new Setting(this.contentEl)
			.setName("Chained Commands")
			.setDesc("The commands to execute in order. Drag to reorder.");

		const commandListEl = this.contentEl.createDiv();

		// Listeners on the container are correct and remain unchanged
		commandListEl.addEventListener("dragover", (event) => {
			event.preventDefault();
			if (event.dataTransfer) {
				event.dataTransfer.dropEffect = "move";
			}
		});

		commandListEl.addEventListener("drop", (event) => {
			if (this.dragIndex === null) return;

			const allSettings = Array.from(
				commandListEl.querySelectorAll(".setting-item"),
			);
			const targetEl = event.target as HTMLElement;
			const dropTarget = targetEl.closest(".setting-item");
			if (!dropTarget) return;

			const dropIndex = allSettings.indexOf(dropTarget);
			if (dropIndex < 0 || dropIndex === this.dragIndex) return;

			const draggedCommand = this.mapping.commands.splice(
				this.dragIndex,
				1,
			)[0];
			this.mapping.commands.splice(dropIndex, 0, draggedCommand);

			this.redraw();
		});

		this.mapping.commands.forEach((command, index) => {
			const setting = new Setting(commandListEl)
				.setName(command.name)
				.addExtraButton((btn) =>
					btn
						.setIcon("trash")
						.setTooltip("Remove command")
						.onClick(() => {
							this.mapping.commands.splice(index, 1);
							this.redraw();
						}),
				);

			// --- CORRECTED DRAG LOGIC ---
			// 1. Manually make the entire setting element draggable. This is a standard DOM property.
			setting.settingEl.draggable = true;

			// 2. Add a visual drag handle using a stable API method.
			setting.addExtraButton((btn) => {
				btn.setIcon("grip-vertical")
					.setTooltip("Drag to reorder")
					.setDisabled(true); // This makes it a non-clickable visual cue.

				// Move the handle to the front of the other buttons for a standard UI.
				setting.controlEl.prepend(btn.extraSettingsEl);
			});
			// --- END CORRECTION ---

			// Listeners on the setting element are correct and remain unchanged
			setting.settingEl.addEventListener(
				"dragstart",
				(event: DragEvent) => {
					this.dragIndex = index;
					if (event.dataTransfer) {
						event.dataTransfer.effectAllowed = "move";
					}
					setting.settingEl.addClass("is-dragging");
				},
			);

			setting.settingEl.addEventListener("dragend", () => {
				this.dragIndex = null;
				commandListEl
					.querySelector(".is-dragging")
					?.removeClass("is-dragging");
			});
		});

		// Buttons to add new commands remain unchanged
		new Setting(this.contentEl)
			.addButton((btn) =>
				btn.setButtonText("Add Obsidian Command").onClick(() => {
					new SearchableCommandModal(this.app, (command) => {
						const newCommand: ObsidianCommand = {
							type: "obsidian",
							id: command.id,
							name: command.name,
						};
						this.mapping.commands.push(newCommand);
						this.redraw();
					}).open();
				}),
			)
			.addButton((btn) =>
				btn.setButtonText("Add 'Open file' Command").onClick(() => {
					new FileSuggestModal(this.app, (file) => {
						const newCommand: OpenFileCommand = {
							type: "open-file",
							path: file.path,
							name: `Open file: ${file.basename}`,
						};
						this.mapping.commands.push(newCommand);
						this.redraw();
					}).open();
				}),
			);
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
			row.createEl("td").setText(
				mapping.commands.map((c) => c.name).join(" → "),
			);
		});
	}
}

export class ConfirmationModal extends Modal {
	constructor(
		app: App,
		private title: string,
		private message: string,
		private onConfirm: () => void,
	) {
		super(app);
	}

	onOpen() {
		this.titleEl.setText(this.title);
		this.contentEl.createEl("p", { text: this.message });

		new Setting(this.contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Confirm")
					.setCta()
					.onClick(() => {
						this.onConfirm();
						this.close();
					}),
			)
			.addButton((btn) =>
				btn.setButtonText("Cancel").onClick(() => {
					this.close();
				}),
			);
	}
}
