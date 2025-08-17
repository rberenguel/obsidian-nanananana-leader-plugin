# Macro engine ideas

---

## Architectural Changes

To support passing data between commands, we need to shift from a simple "fire-and-forget" executor to a stateful, pipeline-based system.

### 1. **Execution Context** (`ExecutionContext`)

This is the most critical addition. We'll introduce a class or object that acts as a "payload" or "context" that is passed from one command in the chain to the next.

- **Purpose**: To hold the state and the "return values" of commands.
- **Properties**: It would contain properties like:
    - `activeFile: TFile | null` - The file that was just opened or acted upon.
    - `clipboardContent: string` - Content read from the system clipboard.
    - `selectedText: string` - The text that was selected when the chain started.
    - `userInput: string | null` - Data gathered from a user prompt during execution.

### 2. **Command Interface and Registry**

We need to formalize what a "command" is within our system. Each command, whether a standard Obsidian command or a virtual one, will have a corresponding runner that knows how to execute it.

- **Interface**: We'll define an interface, say `ICommandRunner`, with a single method: `execute(context: ExecutionContext): Promise<ExecutionContext>`. Each command type will have a class that implements this.
- **Registry**: A simple mapping (e.g., a `Map` object) will associate a command `type` string (like `"open-file"` or `"append-text"`) with its corresponding runner class. This avoids a giant `switch` statement and makes the system easily extensible.

### 3. **Stateful Execution Loop**

The main execution logic needs a complete overhaul.

- **From `for...of` to `async`/`await`**: The loop must be asynchronous. It will instantiate a new `ExecutionContext`, then iterate through the commands in the chain.
- **Pipeline Flow**: In each iteration, it will:
    1.  Look up the command's runner in the registry.
    2.  `await` the execution of the runner, passing in the current `ExecutionContext`.
    3.  Take the _modified_ context returned by the runner and use it as the input for the next command in the chain.

### 4. **Dynamic Argument Resolution**

To make the macros truly powerful, we need a way to handle dynamic inputs.

- **Template Syntax**: We'll introduce a simple template syntax for command arguments stored in the settings, such as `{{clipboard}}`, `{{selection}}`, or `{{prompt:Enter new task}}`.
- **Resolver Service**: Before a command runner is executed, a "resolver" service will process its arguments. It will replace these template strings with real-time data by interacting with the Obsidian API (e.g., reading the clipboard, opening a prompt modal for the user).

---

## Implementation Plan

This can be broken down into iterative phases.

### Phase 1: Core Architectural Refactoring

_Goal: Establish the new execution pipeline without adding new user features yet._

1.  **Define Core Types**: In `types.ts`, define the `ExecutionContext` class and the base interfaces for commands and their arguments.
2.  **Create Command Registry**: Create a new `commands.ts` file to house the command runner implementations and the registry that maps command types to runners.
3.  **Implement `OpenFileCommand` Runner**: Create the first runner for our existing "Open file" virtual command. Its `execute` method will open the specified file and add the `TFile` object to the context's `activeFile` property.
4.  **Rewrite Execution Loop**: In `main.ts`, replace the `executeCommand` logic with the new `async` pipeline that uses the `ExecutionContext` and command registry. At this stage, the plugin's external behavior shouldn't change.

### Phase 2: Add New Context-Aware Commands

_Goal: Introduce new virtual commands that use the pipeline to offer new functionality._

1.  **Create `AppendTextCommand`**:
    - **Runner Logic**: The runner will check if `context.activeFile` exists. If so, it appends its configured text to that file. If not, it could fall back to using the currently open editor pane.
    - **Settings UI**: Update the `MappingEditModal` in `modals.ts` to allow adding this new command type and configuring its static text argument.
2.  **Create Context-Gathering Commands**:
    - **`ReadSelectionCommand`**: A simple command that gets the current editor selection and puts it into `context.selectedText`.
    - **`ReadClipboardCommand`**: A command that reads from `navigator.clipboard` and places the result in `context.clipboardContent`.

### Phase 3: Implement Dynamic Argument Resolution

_Goal: Make the command chains interactive and dynamic._

1.  **Create Resolver Service**: Build the service that can parse a string and replace templates like `{{clipboard}}` and `{{selection}}` with data from the `ExecutionContext`.
2.  **Implement Prompting**: For `{{prompt:Message}}`, the resolver will open a simple modal to get input from the user and return the entered text.
3.  **Integrate with Execution Loop**: Before executing each command, pass its arguments through the resolver service to generate the final values that the runner will use.
4.  **Update Settings UI**: Add hints and documentation in the settings panel to teach users about the available template variables.
