import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class MCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  async connect() {
    this.transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-playwright'],
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
  }

  async login(loginUrl: string, email: string, password: string): Promise<string> {
    if (!this.client) {
      throw new Error('MCP client not connected. Call connect() first.');
    }

    console.log(`🔐 Logging in as ${email}...`);

    try {
      // Navigate to login page
      await this.client.callTool({
        name: 'playwright_navigate',
        arguments: { url: loginUrl },
      });

      // Fill email
      await this.client.callTool({
        name: 'playwright_fill',
        arguments: {
          selector: 'input[name="email"]',
          value: email,
        },
      });

      // Fill password
      await this.client.callTool({
        name: 'playwright_fill',
        arguments: {
          selector: 'input[name="password"]',
          value: password,
        },
      });

      // Click submit
      await this.client.callTool({
        name: 'playwright_click',
        arguments: {
          selector: 'button[type="submit"]',
        },
      });

      // Wait for redirect
      await this.client.callTool({
        name: 'playwright_wait',
        arguments: { timeout: 5000 },
      });

      // Get token from localStorage
      const tokenResult = await this.client.callTool({
        name: 'playwright_evaluate',
        arguments: {
          script: `
            localStorage.getItem('access_token') || 
            localStorage.getItem('token') ||
            sessionStorage.getItem('access_token') ||
            sessionStorage.getItem('token')
          `,
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

