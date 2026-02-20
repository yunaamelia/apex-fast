/* eslint-disable no-console */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { FastApplyPlugin } from './fast-apply-plugin.js';
import * as dotenv from 'dotenv';
import url from 'node:url';

// Load env vars
dotenv.config();

/**
 * Initializes the MCP Server using the FastApplyPlugin logic
 */
async function runMcpServer() {
  // If we run as a remote server, we need the user to either provide MORPH_API_KEY
  // in their environment, or we can't run. `FastApplyPlugin()` will check this.
  // Provide a dummy context for the plugin initialization
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugin = await FastApplyPlugin({ directory: process.cwd() } as any);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fastApplyTool = (plugin as any).tool?.fastApply;

  if (!fastApplyTool) {
    throw new Error('Fast Apply tool not found in plugin');
  }

  // Create MCP Server instance
  const server = new McpServer({
    name: 'apex-fast-mcp',
    version: '0.0.1',
  });

  // Register the fastApply tool on the MCP server
  server.tool(
    'fastApply',
    'Edit file content using fast apply',
    {
      filePath: z.string().describe('Relative path to the file to edit'),
      instructions: z.string().describe('Clear instructions on what to change'),
      codeEdit: z.string().optional().describe('The specific code snippet to edit (optional)'),
    },
    async (args) => {
      try {
        // FastApplyPlugin expects context to have a directory.
        // For a remote MCP server, "directory" means the working directory where the server is running.
        // In a real cloud setup, this might need to be customizable, but defaulting to cwd is standard.
        const context = { directory: process.cwd() };

        await fastApplyTool.execute(
          {
            filePath: args.filePath,
            instructions: args.instructions,
            codeEdit: args.codeEdit,
          },
          context
        );

        return {
          content: [{ type: 'text', text: `Successfully applied changes to ${args.filePath}` }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: String(error) }],
          isError: true,
        };
      }
    }
  );

  // --- TRANSPORT SELECTION ---
  // If the user runs `node mcp-server.js sse <port>`, we start the Express server
  // Otherwise, we default to stdio transport (perfect for Claude Desktop or local clients)

  const args = process.argv.slice(2);
  const isSSE = args[0] === 'sse';

  if (isSSE) {
    const port = parseInt(args[1] || '3000', 10);
    const app = express();
    app.use(cors());

    // Keeping track of SSE transport connections
    let transport: SSEServerTransport | null = null;

    app.get('/sse', async (req, res) => {
      console.info('Received SSE connection request');
      transport = new SSEServerTransport('/message', res);
      await server.connect(transport);
    });

    app.post('/message', async (req, res) => {
      if (!transport) {
        res.status(400).send('SSE transport not initialized. Connect to /sse first.');
        return;
      }
      await transport.handlePostMessage(req, res);
    });

    app.listen(port, () => {
      console.info(`[MCP Server] SSE Transport listening on http://localhost:${port}`);
      console.info(`[MCP Server] Connect clients to:`);
      console.info(`   SSE Endpoint: http://localhost:${port}/sse`);
      console.info(`   Message Endpoint: http://localhost:${port}/message`);
    });
  } else {
    // Standard Stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.warn('[MCP Server] Stdio Transport started.');
  }
}

// Check if this module is being run directly
const isMain = import.meta.url === url.pathToFileURL(process.argv[1]).href;
if (isMain) {
  runMcpServer().catch((error) => {
    console.warn('Fatal error running MCP Server:', error);
    process.exit(1);
  });
}

export { runMcpServer };
