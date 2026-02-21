# apex-fast

**apex-fast** is a plugin for [OpenCode AI](https://opencode.ai) that integrates [Morph Fast Apply](https://morphllm.com) — an AI model specialized for code editing boasting 10,500+ tokens/second speeds and 98% accuracy. This plugin overrides the built-in edit tool with `morph_edit`, which is significantly faster for large files and complex changes.

---

## ✨ Features

- ⚡ **10x Faster** — Uses partial snippets, no need to read the entire file
- 🧠 **Smart Routing** — Automatically selects `morph-v3-fast` or `morph-v3-large` models based on instruction complexity
- 🔒 **Overrides `edit` Tool** — Blocks the built-in `edit` tool and directs the AI to use `fastApply` instead
- 🛡️ **Pre-flight Validation & Readonly Agents Protection** — Prevents catastrophic accidental deletions and disables edits in `plan` or `explore` modes.
- 🛠️ **MCP Server** — Can be run as a standalone MCP server (local via stdio or remote via SSE)

---

## 🚀 Installation

### Step 1: Get Morph API Key

Sign up and get your API key at **[morphllm.com](https://morphllm.com)**.

---

### Step 2: Configure Plugin in OpenCode

Edit your `~/.config/opencode/opencode.json` file and add the plugin:

```json
{
  "plugin": ["apex-fast@latest"],
  "instructions": ["Follow Instructions in `~/.config/opencode/Morph-Rules.md`"]
}
```

> **Note:** The `"instructions"` field tells the AI to read `Morph-Rules.md` as its guide on when to use `fastApply` vs other tools.

---

### Step 3: Install `Morph-Rules.md` _(REQUIRED)_

The `Morph-Rules.md` file acts as the primary behavioral guideline for the AI. You **must** copy it into your OpenCode config directory. Without it, the AI won't know how to use `morph_edit` properly.

```bash
# Download Morph-Rules.md into your OpenCode config directory
curl -o ~/.config/opencode/Morph-Rules.md \
  https://raw.githubusercontent.com/yunaamelia/apex-fast/main/Morph-Rules.md
```

Alternatively, manually copy it from this repository.

---

### Step 4: Set Environment Variable

The plugin requires the `MORPH_API_KEY` to be available in your environment.

**Permanent approach (recommended):**

```bash
# Add to ~/.bashrc or ~/.zshrc
echo 'export MORPH_API_KEY="sk-your-key-here"' >> ~/.bashrc
source ~/.bashrc
```

**Or** add it directly to a `.env` file in your working directory:

```env
MORPH_API_KEY=sk-your-key-here
```

---

## 🛠️ Using the `fastApply` Tool

Once the plugin is active, your AI will have access to the `fastApply` tool. Use the syntax `// ... existing code ...` as a marker for unchanged code.

### Parameters

| Parameter      | Type     | Required | Description                                                   |
| -------------- | -------- | -------- | ------------------------------------------------------------- |
| `filePath`     | `string` | ✅       | Relative path to the file you want to edit                    |
| `instructions` | `string` | ✅       | Specific instructions detailing what to change                |
| `codeEdit`     | `string` | ❌       | Partial code snippet using `// ... existing code ...` markers |

### Usage Examples

**Adding a new function:**

```javascript
// ... existing code ...
import { newDep } from './newDep';
// ... existing code ...

function newFeature() {
  return newDep.process();
}
// ... existing code ...
```

**Modifying existing code:**

```javascript
// ... existing code ...
function existingFunc(param) {
  // Updated implementation
  const result = param * 2; // Changed from * 1
  return result;
}
// ... existing code ...
```

> ⚠️ **IMPORTANT:** Always include `// ... existing code ...` at the beginning and end of your snippet. Otherwise, Morph will **delete** the code outside of the snippet.

---

## 📋 Tool Selection Guide

| Situation                        | Tool        | Reason                                    |
| -------------------------------- | ----------- | ----------------------------------------- |
| Small & exact string replacement | `edit`      | Fastest, no API call                      |
| Simple variable/function rename  | `edit`      | Precise, no AI needed                     |
| **Large files (300+ lines)**     | `fastApply` | 10x faster, partial snippets              |
| **Multiple scattered changes**   | `fastApply` | Batch changes in one pass                 |
| **Complex refactoring**          | `fastApply` | AI parses context better                  |
| **Whitespace-sensitive edits**   | `fastApply` | High tolerance for formatting differences |

---

## 🖥️ Running as an MCP Server (Optional)

This plugin can also run as a **standalone MCP Server** for use with other MCP clients (like Claude Desktop).

### Stdio Mode (Default)

```bash
MORPH_API_KEY=sk-your-key npx apex-fast-mcp
```

### SSE Mode (Remote/HTTP)

```bash
MORPH_API_KEY=sk-your-key npx apex-fast-mcp sse 3000
```

The server will run on:

- **SSE Endpoint:** `http://localhost:3000/sse`
- **Message Endpoint:** `http://localhost:3000/message`

---

## ⚠️ Troubleshooting

### Error: `[ERROR] Missing MORPH_API_KEY`

The plugin cannot find the API key. Ensure:

- The `MORPH_API_KEY` environment variable is set
- If using `.env`, the file exists in the current working directory

### Error: `[ERROR] Failed to read file`

The specific `filePath` cannot be read. Ensure:

- The path provided is **relative** to the current working directory
- The file actually exists

### Pre-flight Validation Error

If you attempt to edit a large file (>10 lines) and omit the `// ... existing code ...` markers, the plugin will block the tool call to prevent catastrophic code loss. The AI should simply rewrite the `codeEdit` parameter correctly wrapped inside markers.

### Fallback Behavior for Morph API Failure

If Morph API times out or rate limits:

1. The plugin will return an error message containing the specifics
2. The AI can fall back to using the built-in `edit` tool
3. The built-in `edit` tool requires exact string matching

---

## 🔧 Development

```bash
mise run build     # Build the project
mise run test      # Run the test suite
mise run lint      # Lint the code
mise run lint:fix  # Automatically fix linting issues
```

---

## 📦 Release

See the [RELEASE.md](RELEASE.md) file for instructions on how to release a new version.

---

## 🤝 Contributing

Contributions are very welcome! Please open an issue or submit a pull request on the GitHub repository.

---

## 📄 License

See the [LICENSE](LICENSE) file for details.
