# apex-fast

Fast Apply is a tool that you give to your AI agent that allows it to edit code or files.

> A Bun module created from the [bun-module](https://github.com/zenobi-us/bun-module) template

## Installation

```bash
npm install apex-fast
```

## Usage

### As an OpenCode Plugin

Import and use `FastApplyPlugin` within your OpenCode plugin configuration:

```typescript
import { FastApplyPlugin } from 'apex-fast';

export const MyPlugin = async (ctx) => {
  const applyPlugin = await FastApplyPlugin(ctx);
  
  return {
    ...applyPlugin,
    // your other hooks and tools
  };
};
```

Make sure to set the `MORPH_API_KEY` environment variable.

### As a Remote MCP Server

This package includes a Model Context Protocol (MCP) server so that you can expose the Fast Apply tool securely over an online connection. The server supports the standard Stdio transport, as well as an HTTP/SSE (Server-Sent Events) transport.

#### 1. Setup Environment
Ensure your `MORPH_API_KEY` is set in your environment:
```bash
export MORPH_API_KEY="your-morph-api-key"
```

#### 2. Running Local (Stdio Transport)
Ideal if you want to use it with desktop apps that spawn the server directly (like Claude Desktop):
```bash
npx apex-fast-mcp
```

#### 3. Running Online (HTTP/SSE Transport)
To expose this online, you can start the server using the SSE transport and provide a port (default 3000):
```bash
npx apex-fast-mcp sse 8080
```
This will start an Express server listening on the port. Clients can then connect to:
- **SSE URL**: `http://<your-server>:8080/sse`
- **Messages URL**: `http://<your-server>:8080/message`

## Development

- `mise run build` - Build the module
- `mise run test` - Run tests
- `mise run lint` - Lint code
- `mise run lint:fix` - Fix linting issues
- `mise run format` - Format code with Prettier

## Release

See the [RELEASE.md](RELEASE.md) file for instructions on how to release a new version of the module.

## Contributing

Contributions are welcome! Please file issues or submit pull requests on the GitHub repository.

## License

See the [LICENSE](LICENSE) file for details.
