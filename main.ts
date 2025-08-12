import { Plugin, Notice } from "obsidian";
import { LeaderSettings, DEFAULT_SETTINGS } from "./types";
import { LeaderSettingsTab } from "./settings";
import { areHotkeysEqual, fromKeyEvent } from "./utils";
import { HelpModal, SearchableCommandModal } from "modals";

export default class LeaderHotkeys extends Plugin {
	settings: LeaderSettings;
	private isLeaderModeActive = false;
	private leaderModeTimeoutId: NodeJS.Timeout | null = null;
	private statusBarItemEl: HTMLElement;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new LeaderSettingsTab(this.app, this));

		this.statusBarItemEl = this.addStatusBarItem();
		this.statusBarItemEl.setText("␣ LEADER");
		this.statusBarItemEl.hide();

		this.registerDomEvent(
			document,
			"keydown",
			this.handleKeyDown.bind(this),
			{
				capture: true,
			},
		);
	}

	private handleKeyDown(event: KeyboardEvent): void {
		if (this.isLeaderModeActive) {
			const isModifierOnly = [
				"Control",
				"Shift",
				"Alt",
				"Meta",
				"Hyper",
				"CapsLock",
			].includes(event.key);
			if (isModifierOnly) {
				// User is holding a modifier, so we wait for the next key.
				// Do not process this event further.
				return;
			}
		}

		const hotkey = fromKeyEvent(event);

		if (this.isLeaderModeActive) {
			event.preventDefault();
			event.stopPropagation();
			this.clearTimeout();

			if (hotkey.key === "ESCAPE") {
				this.exitLeaderMode();
				return;
			}

			if (hotkey.key === "?") {
				// Or 'SHIFT' + '/' depending on your fromKeyEvent logic
				new HelpModal(this.app, this.settings.mappings).open();
				// Optional: you might want to exit or stay in leader mode here
				this.exitLeaderMode();
				return;
			}

			if (hotkey.key === ":") {
				this.exitLeaderMode(); // Exit before opening prompt
				this.openLeaderCommandPrompt();
				return;
			}
			const mapping = this.settings.mappings.find((m) =>
				areHotkeysEqual(m.trigger, hotkey),
			);

			if (mapping) {
				(this.app as any).commands.executeCommandById(
					mapping.commandId,
				);
			} else {
				new Notice("Leader Hotkeys: No mapping found.");
			}
			this.exitLeaderMode();
		} else if (areHotkeysEqual(hotkey, this.settings.leaderKey)) {
			event.preventDefault();
			event.stopPropagation();
			this.enterLeaderMode();
		}
	}

	private openLeaderCommandPrompt(): void {
		// We reuse SearchableCommandModal, but the callback is different.
		// Instead of creating a mapping, it just executes the command.
		new SearchableCommandModal(this.app, (command) => {
			(this.app as any).commands.executeCommandById(command.id);
		}).open();
	}

	private enterLeaderMode(): void {
		this.isLeaderModeActive = true;
		document.body.classList.add("leader-mode-active");
		this.statusBarItemEl.show();
		this.leaderModeTimeoutId = setTimeout(() => {
			new Notice("Leader mode timed out.");
			this.exitLeaderMode();
		}, this.settings.timeout);
	}

	private exitLeaderMode(): void {
		this.isLeaderModeActive = false;
		document.body.classList.remove("leader-mode-active");
		this.statusBarItemEl.hide();
		this.clearTimeout();
	}

	private clearTimeout(): void {
		if (this.leaderModeTimeoutId) {
			clearTimeout(this.leaderModeTimeoutId);
			this.leaderModeTimeoutId = null;
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
