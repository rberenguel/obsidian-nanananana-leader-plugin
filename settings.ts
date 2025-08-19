import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import LeaderHotkeys from "./main";
import { CommandMapping, Hotkey } from "./types";
import { toDisplayString, areSequencesEqual } from "./utils";
import {
	KeyRecorderModal,
	MappingEditModal,
	ConfirmationModal,
} from "./modals";

export class LeaderSettingsTab extends PluginSettingTab {
	plugin: LeaderHotkeys;

	constructor(app: App, plugin: LeaderHotkeys) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", {
			text: "Leader Hotkeys Settings",
		});

		new Setting(containerEl)
			.setName("Leader Key")
			.setDesc(
				"The key that activates leader mode. Default is Mod+Space.",
			)
			.addButton((button) => {
				button
					.setTooltip("Click to set new leader key")
					.setButtonText(
						toDisplayString([this.plugin.settings.leaderKey]),
					)
					.onClick(() => {
						new KeyRecorderModal(
							this.app,
							"Press new leader key",
							(hotkey) => {
								if (hotkey.length > 0) {
									this.plugin.settings.leaderKey = hotkey[0];
									this.plugin.saveSettings();
									this.display();
								}
							},
						).open();
					});
			});

		new Setting(containerEl)
			.setName("Leader mode timeout")
			.setDesc(
				"Time in milliseconds to wait for a command before exiting leader mode.",
			)
			.addText((text) =>
				text
					.setPlaceholder("e.g., 2000")
					.setValue(this.plugin.settings.timeout.toString())
					.onChange(async (value) => {
						const timeout = parseInt(value, 10);
						if (!isNaN(timeout)) {
							this.plugin.settings.timeout = timeout;
							await this.plugin.saveSettings();
						}
					}),
			);

		new Setting(containerEl)
			.setName("Chained command timeout")
			.setDesc(
				"If a key sequence is a command and also a prefix to another, this is the time in ms to wait for the next key.",
			)
			.addText((text) =>
				text
					.setPlaceholder("e.g., 1000")
					.setValue(this.plugin.settings.multiKeyTimeout.toString())
					.onChange(async (value) => {
						const timeout = parseInt(value, 10);
						if (!isNaN(timeout)) {
							this.plugin.settings.multiKeyTimeout = timeout;
							await this.plugin.saveSettings();
						}
					}),
			);

		containerEl.createEl("h3", { text: "Command Mappings" });
		new Setting(containerEl).addButton((button) =>
			button
				.setButtonText("Add new mapping")
				.setCta()
				.onClick(() => {
					this.openAddMappingWorkflow();
				}),
		);
		this.plugin.settings.mappings.forEach((mapping, index) => {
			const setting = new Setting(containerEl).setName(
				mapping.commands.map((c) => c.name).join(" → "),
			);

			// Move trigger to the right-hand side for clarity
			const triggerDiv = setting.controlEl.createDiv({
				cls: "leader-hotkey-display",
			});
			triggerDiv
				.createEl("kbd")
				.setText(toDisplayString(mapping.trigger));
			triggerDiv.style.marginRight = "1em"; // Add spacing before buttons

			setting.addExtraButton((button) => {
				button
					.setIcon("pencil")
					.setTooltip("Edit mapping")
					.onClick(() => {
						this.openEditMappingWorkflow(mapping, index);
					});
			});

			setting.addExtraButton((button) => {
				button
					.setIcon("trash")
					.setTooltip("Delete mapping")
					.onClick(() => {
						// MODIFIED: Use the confirmation modal instead of deleting directly
						new ConfirmationModal(
							this.app,
							"Delete Mapping",
							`Are you sure you want to delete the mapping for "${toDisplayString(
								mapping.trigger,
							)}"? This cannot be undone.`,
							async () => {
								this.plugin.settings.mappings.splice(index, 1);
								await this.plugin.saveSettings();
								this.display(); // Redraw the settings
							},
						).open();
					});
			});
		});
	}

	private openAddMappingWorkflow() {
		const newMapping: CommandMapping = {
			trigger: [],
			commands: [],
		};

		new MappingEditModal(this.app, newMapping, (savedMapping) => {
			const existing = this.plugin.settings.mappings.find((m) =>
				areSequencesEqual(m.trigger, savedMapping.trigger),
			);
			if (existing) {
				new Notice(
					`Error: Sequence "${toDisplayString(
						savedMapping.trigger,
					)}" is already mapped to "${existing.commands.map((c) => c.name).join(" → ")}".`,
				);
				return false;
			}

			this.plugin.settings.mappings.push(savedMapping);
			this.sortAndSave();
			return true;
		}).open();
	}

	private openEditMappingWorkflow(mapping: CommandMapping, index: number) {
		new MappingEditModal(this.app, mapping, (savedMapping) => {
			const existing = this.plugin.settings.mappings.find(
				(m, i) =>
					i !== index &&
					areSequencesEqual(m.trigger, savedMapping.trigger),
			);
			if (existing) {
				new Notice(
					`Error: Sequence "${toDisplayString(
						savedMapping.trigger,
					)}" is already mapped to "${existing.commands.map((c) => c.name).join(" → ")}".`,
				);
				return false;
			}

			this.plugin.settings.mappings[index] = savedMapping;
			this.sortAndSave();
			return true;
		}).open();
	}

	private sortAndSave() {
		this.plugin.settings.mappings.sort(
			(a, b) =>
				a.trigger.length - b.trigger.length ||
				toDisplayString(a.trigger).localeCompare(
					toDisplayString(b.trigger),
				),
		);
		this.plugin.saveSettings();
		this.display();
	}
}
