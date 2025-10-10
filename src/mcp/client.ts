import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class MCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  async connect() {
    console.log('🔌 Connecting to Microsoft Playwright MCP server...');
    this.transport = new StdioClientTransport({
      command: 'npx',
      args: [
        '-y', 
        '@playwright/mcp',
        '--browser', 'chromium',  // Use installed Chromium instead of Chrome
        '--headless'               // Run in headless mode for automation
      ],
    });

    this.client = new Client(
      {
        name: 'broadcast-automation',
        version: '2.0.0',
      },
      {
        capabilities: {},
      }
    );

    await this.client.connect(this.transport);
    console.log('✅ Connected to Playwright MCP server');
  }

  async login(loginUrl: string, email: string, password: string): Promise<string> {
    if (!this.client) {
      throw new Error('MCP client not connected. Call connect() first.');
    }

    console.log(`🔐 Logging in as ${email}...`);

    try {
      // Navigate to login page
      await this.client.callTool({
        name: 'browser_navigate',
        arguments: { url: loginUrl },
      });

      // Wait for page to load
      await this.client.callTool({
        name: 'browser_wait_for',
        arguments: { time: 2 },
      });

      // Get page snapshot to find elements
      const snapshot = await this.client.callTool({
        name: 'browser_snapshot',
        arguments: {},
      });

      console.log('📸 Page snapshot captured, filling form...');

      // Type email
      await this.client.callTool({
        name: 'browser_type',
        arguments: {
          element: 'email input field',
          ref: 'input[name="email"]',
          text: email,
        },
      });

      // Type password
      await this.client.callTool({
        name: 'browser_type',
        arguments: {
          element: 'password input field',
          ref: 'input[name="password"]',
          text: password,
        },
      });

      // Click submit button
      await this.client.callTool({
        name: 'browser_click',
        arguments: {
          element: 'submit button',
          ref: 'button[type="submit"]',
        },
      });

      // Wait for redirect/navigation
      await this.client.callTool({
        name: 'browser_wait_for',
        arguments: { time: 5 },
      });

      // Execute JavaScript to get token from storage
      const tokenResult = await this.client.callTool({
        name: 'browser_evaluate',
        arguments: {
          function: `() => {
            return localStorage.getItem('access_token') || 
                   localStorage.getItem('token') ||
                   sessionStorage.getItem('access_token') ||
                   sessionStorage.getItem('token');
          }`,
        },
      });

      // Type guard for MCP response
      const content = tokenResult.content as Array<{ text?: string }> | undefined;
      const token = content?.[0]?.text;

      if (!token) {
        throw new Error('Failed to retrieve token from storage');
      }

      console.log(`✅ Token retrieved for ${email}`);
      return token;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Login failed for ${email}: ${errorMessage}`);
    }
  }

  async close() {
    if (this.client) {
      await this.client.close();
    }
  }
}

