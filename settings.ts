import { App, PluginSettingTab, Setting, Command } from "obsidian";
import LeaderHotkeys from "./main";
import { CommandMapping, Hotkey } from "./types";
import { toDisplayString, areSequencesEqual } from "./utils";
import { SearchableCommandModal, KeyRecorderModal } from "./modals";

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
			text: "Nanananana Leader: Hotkeys Settings",
		});

		new Setting(containerEl)
			.setName("Leader Key")
			.setDesc("The key that activates leader mode. Default is Mod+Space.")
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

		this.plugin.settings.mappings.forEach((mapping) => {
			const setting = new Setting(containerEl)
				.setName(mapping.commandName)
				.setDesc(
					`Triggered by pressing the key sequence after the leader key.`,
				);

			const hotkeyDisplay = setting.controlEl.createDiv({
				cls: "leader-hotkey-display is-clickable",
			});
			// FIX: Use the 'title' property for standard HTML tooltips
			hotkeyDisplay.title = "Click to change keybinding";

			const kbd = hotkeyDisplay.createEl("kbd");
			kbd.setText(toDisplayString(mapping.trigger));
			
			hotkeyDisplay.addEventListener("click", () => {
				new KeyRecorderModal(
					this.app,
					`Press new sequence for "${mapping.commandName}"`,
					(hotkeySequence: Hotkey[]) => {
						const existing = this.plugin.settings.mappings.find(
							(m) => areSequencesEqual(m.trigger, hotkeySequence)
						);
						if (existing && existing.commandId !== mapping.commandId) {
							new (this.app as any).Notice(
								`Error: Sequence "${toDisplayString(
									hotkeySequence,
								)}" is already mapped to "${
									existing.commandName
								}".`,
							);
							return;
						}

						mapping.trigger = hotkeySequence;

						this.plugin.settings.mappings.sort(
							(a, b) =>
								a.trigger.length - b.trigger.length ||
								toDisplayString(a.trigger).localeCompare(
									toDisplayString(b.trigger),
								),
						);
						this.plugin.saveSettings();
						this.display();
					},
				).open();
			});

			setting.addExtraButton((button) => {
				button
					.setIcon("trash")
					.setTooltip("Delete mapping")
					.onClick(async () => {
						const indexToDelete = this.plugin.settings.mappings.findIndex(m => m.commandId === mapping.commandId && areSequencesEqual(m.trigger, mapping.trigger));
						if (indexToDelete > -1) {
							this.plugin.settings.mappings.splice(indexToDelete, 1);
							await this.plugin.saveSettings();
							this.display();
						}
					});
			});
		});

		new Setting(containerEl).addButton((button) =>
			button
				.setButtonText("Add new mapping")
				.setCta()
				.onClick(() => {
					this.openAddMappingWorkflow();
				}),
		);
	}

	private openAddMappingWorkflow() {
		new SearchableCommandModal(this.app, (command: Command) => {
			new KeyRecorderModal(
				this.app,
				`Press trigger sequence for "${command.name}"`,
				(hotkeySequence: Hotkey[]) => {
					const existing = this.plugin.settings.mappings.find((m) =>
						areSequencesEqual(m.trigger, hotkeySequence),
					);
					if (existing) {
						new (this.app as any).Notice(
							`Error: Sequence "${toDisplayString(
								hotkeySequence,
							)}" is already mapped to "${
								existing.commandName
							}".`,
						);
						return;
					}

					const newMapping: CommandMapping = {
						trigger: hotkeySequence,
						commandId: command.id,
						commandName: command.name,
					};

					this.plugin.settings.mappings.push(newMapping);
					this.plugin.settings.mappings.sort(
						(a, b) =>
							a.trigger.length - b.trigger.length ||
							toDisplayString(a.trigger).localeCompare(
								toDisplayString(b.trigger),
							),
					);
					this.plugin.saveSettings();
					this.display();
				},
			).open();
		}).open();
	}
}