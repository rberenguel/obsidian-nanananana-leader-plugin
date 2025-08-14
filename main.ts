import { Plugin, Notice } from "obsidian";
import {
	LeaderSettings,
	DEFAULT_SETTINGS,
	Hotkey,
	CommandMapping,
} from "./types";
import { LeaderSettingsTab } from "./settings";
import {
	areHotkeysEqual,
	fromKeyEvent,
	isPrefixOf,
	areSequencesEqual,
	toDisplayString,
} from "./utils";
import { HelpModal, SearchableCommandModal } from "./modals";

export default class LeaderHotkeys extends Plugin {
	settings: LeaderSettings;
	private isLeaderModeActive = false;
	private leaderModeTimeoutId: NodeJS.Timeout | null = null;
	private multiKeyTimeoutId: NodeJS.Timeout | null = null;
	private currentSequence: Hotkey[] = [];
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
				return;
			}
		}

		const hotkey = fromKeyEvent(event);

		if (this.isLeaderModeActive) {
			event.preventDefault();
			event.stopPropagation();
			this.clearLeaderTimeout();
			this.clearMultiKeyTimeout();

			if (this.currentSequence.length === 0) {
				if (hotkey.key === "?") {
					new HelpModal(this.app, this.settings.mappings).open();
					this.exitLeaderMode();
					return;
				}
				if (hotkey.key === ":") {
					this.exitLeaderMode();
					this.openLeaderCommandPrompt();
					return;
				}
			}

			this.currentSequence.push(hotkey);
			this.updateStatusBar();

			const potentialMatches = this.settings.mappings.filter((m) =>
				isPrefixOf(this.currentSequence, m.trigger),
			);

			if (potentialMatches.length === 0) {
				new Notice(
					`Leader: No mapping for "${toDisplayString(
						this.currentSequence,
					)}"`,
				);
				this.exitLeaderMode();
				return;
			}

			const exactMatch = potentialMatches.find((m) =>
				areSequencesEqual(this.currentSequence, m.trigger),
			);
			const isPrefix = potentialMatches.some(
				(m) => m.trigger.length > this.currentSequence.length,
			);

			if (exactMatch && isPrefix) {
				this.multiKeyTimeoutId = setTimeout(() => {
					this.executeCommand(exactMatch);
				}, this.settings.multiKeyTimeout);
				this.startLeaderTimeout();
			} else if (exactMatch && !isPrefix) {
				this.executeCommand(exactMatch);
			} else if (!exactMatch && isPrefix) {
				this.startLeaderTimeout();
			} else {
				new Notice(
					`Leader: Invalid sequence "${toDisplayString(
						this.currentSequence,
					)}"`,
				);
				this.exitLeaderMode();
			}
		} else if (areHotkeysEqual(hotkey, this.settings.leaderKey)) {
			event.preventDefault();
			event.stopPropagation();
			this.enterLeaderMode();
		}
	}

	private executeCommand(mapping: CommandMapping) {
		(this.app as any).commands.executeCommandById(mapping.commandId);
		this.exitLeaderMode();
	}

	private openLeaderCommandPrompt(): void {
		new SearchableCommandModal(this.app, (command) => {
			(this.app as any).commands.executeCommandById(command.id);
		}).open();
	}

	private enterLeaderMode(): void {
		this.isLeaderModeActive = true;
		this.currentSequence = [];
		document.body.classList.add("leader-mode-active");
		this.updateStatusBar();
		this.statusBarItemEl.show();
		this.startLeaderTimeout();
	}

	private exitLeaderMode(): void {
		this.isLeaderModeActive = false;
		this.currentSequence = [];
		document.body.classList.remove("leader-mode-active");
		this.statusBarItemEl.hide();
		this.clearLeaderTimeout();
		this.clearMultiKeyTimeout();
	}

	private startLeaderTimeout(): void {
		this.clearLeaderTimeout();
		this.leaderModeTimeoutId = setTimeout(() => {
			new Notice("Leader mode timed out.");
			this.exitLeaderMode();
		}, this.settings.timeout);
	}

	private clearLeaderTimeout(): void {
		if (this.leaderModeTimeoutId) {
			clearTimeout(this.leaderModeTimeoutId);
			this.leaderModeTimeoutId = null;
		}
	}

	private clearMultiKeyTimeout(): void {
		if (this.multiKeyTimeoutId) {
			clearTimeout(this.multiKeyTimeoutId);
			this.multiKeyTimeoutId = null;
		}
	}

	private updateStatusBar(): void {
		if (this.currentSequence.length > 0) {
			this.statusBarItemEl.setText(`␣ ${toDisplayString(this.currentSequence)}`);
		} else {
			this.statusBarItemEl.setText("␣ LEADER");
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