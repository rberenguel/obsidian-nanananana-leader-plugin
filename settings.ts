import { App, PluginSettingTab, Setting, Command } from "obsidian";
import LeaderHotkeys from "./main";
import { CommandMapping, Hotkey } from "./types";
import { toDisplayString } from "./utils";
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
			.setDesc(
				"The key that activates leader mode. Default is Mod+Space.",
			)
			.addButton((button) => {
				button
					.setTooltip("Click to set new leader key")
					.setButtonText(
						toDisplayString(this.plugin.settings.leaderKey),
					)
					.onClick(() => {
						new KeyRecorderModal(
							this.app,
							"Press new leader key",
							(hotkey) => {
								this.plugin.settings.leaderKey = hotkey;
								this.plugin.saveSettings();
								this.display();
							},
						).open();
					});
			});

		new Setting(containerEl)
			.setName("Timeout")
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

		containerEl.createEl("h3", { text: "Command Mappings" });

		this.plugin.settings.mappings.forEach((mapping, index) => {
			const setting = new Setting(containerEl)
				.setName(mapping.commandName)
				.setDesc(
					`Triggered by pressing the key combination after the leader key.`,
				);

			const hotkeyDisplay = setting.controlEl.createDiv({
				cls: "leader-hotkey-display",
			});
			const kbd = hotkeyDisplay.createEl("kbd");
			kbd.setText(toDisplayString(mapping.trigger));

			setting.addExtraButton((button) => {
				button
					.setIcon("trash")
					.setTooltip("Delete mapping")
					.onClick(async () => {
						this.plugin.settings.mappings.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
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
				`Press trigger key for "${command.name}"`,
				(hotkey: Hotkey) => {
					const existing = this.plugin.settings.mappings.find(
						(m) =>
							m.trigger.key === hotkey.key &&
							JSON.stringify(m.trigger.modifiers) ===
								JSON.stringify(hotkey.modifiers),
					);
					if (existing) {
						new (this.app as any).Notice(
							`Error: Key "${toDisplayString(hotkey)}" is already mapped to "${existing.commandName}".`,
						);
						return;
					}

					const newMapping: CommandMapping = {
						trigger: hotkey,
						commandId: command.id,
						commandName: command.name,
					};

					this.plugin.settings.mappings.push(newMapping);
					this.plugin.saveSettings();
					this.display();
				},
			).open();
		}).open();
	}
}
