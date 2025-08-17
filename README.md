# Nanananana: Leader

> **nanananana**: Leader key for commands in Obsidian

An Obsidian plugin that provides a "leader key" to trigger commands, creating a new layer of keyboard shortcuts.

![](https://raw.githubusercontent.com/rberenguel/obsidian-nanananana-leader-plugin/main/media/nanananana.gif)

## Some use cases

- Splitting vertically or horizontally quickly, without polluting the "main" shortcut list.
- Moving around these splits.
- "Zen" mode, toggling all sidebars and ribbon as a chain of commands.
- Fix some annoyances on mobile (iPad):
    - Switching across panels does not move editing focus to them. Chain _Focus on tab group POS_ with _Focus on last note_ to fix this.
    - Same for splitting vertically / horizontally.
- Shortcuts to files. Like your `Inbox` file, or your `Projects` base, or…

## Features

This plugin provides a "leader key" functionality, inspired by tmux (or vim), to create a new layer of keybindings.

- **Leader Key**: Press a designated "leader" hotkey (default: `Mod+Space`) to enter a special mode.
- **Command Mappings**: Once in leader mode, press a subsequent key(s) to trigger any Obsidian command, or a series of commands. You can also add hotkeys to open specific files.
- **Customizable**: Configure the leader key, the timeout, and all command mappings through the settings tab.
- **Discoverability**: A status bar item and a border effect indicate when leader mode is active.
- **Help Modal**: Press `?` in leader mode to see a list of all your configured key mappings.

> [!WARNING]
> This plugin is for now _desktop_ (or at least, device with keyboard) only.

![](https://raw.githubusercontent.com/rberenguel/obsidian-nanananana-leader-plugin/main/media/nanananana-leader.png)

![](https://raw.githubusercontent.com/rberenguel/obsidian-nanananana-leader-plugin/main/media/nanananana-leader-chains.png)

## Installation

### Manual Installation

1.  Download the latest release files (`main.js`, `styles.css`, `manifest.json`) from the **Releases** page of the GitHub repository (or the zip file, contains all of these).
2.  Find your Obsidian vault's plugins folder by going to `Settings` > `About` and clicking `Open` next to `Override config folder`. Inside that folder, navigate into the `plugins` directory.
3.  Create a new folder named `nanananana`.
4.  Copy the `main.js`, `manifest.json`, and `styles.css` files into the new `nanananana` folder.
5.  In Obsidian, go to **Settings** > **Community Plugins**.
6.  Make sure "Restricted mode" is turned off. Click the "Reload plugins" button.
7.  Find "nanananana" in the list and **enable** it.
