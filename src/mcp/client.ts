import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import axios from 'axios';

interface Auth0TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

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
        '--headless',              // Run in headless mode for automation
        '--isolated'               // Keep browser profile in memory (no persistence)
        // NOTE: NOT using --shared-browser-context to get fresh contexts
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
  
  /**
   * Clear ALL browser data to simulate a fresh incognito session
   * This is more efficient than spawning a new browser process
   */
  private async clearBrowserSession(appDomain: string) {
    if (!this.client) return;
    
    console.log('   🧹 Clearing all browser data (cookies, storage, cache)...');
    
    // Navigate to the actual app domain first to access domain-specific cookies
    await this.client.callTool({
      name: 'browser_navigate',
      arguments: { url: appDomain },
    });
    
    await this.client.callTool({
      name: 'browser_wait_for',
      arguments: { time: 2 },
    });
    
    // Clear everything on the actual domain
    await this.client.callTool({
      name: 'browser_evaluate',
      arguments: {
        function: `async () => {
          // Clear localStorage and sessionStorage
          localStorage.clear();
          sessionStorage.clear();
          
          // Clear ALL cookies for this domain and parent domains
          const allCookies = document.cookie.split(';');
          console.log('Clearing ' + allCookies.length + ' cookies');
          
          allCookies.forEach(cookie => {
            const name = cookie.split('=')[0].trim();
            if (name) {
              // Get all domain variations
              const hostname = window.location.hostname;
              const parts = hostname.split('.');
              
              // Clear for current domain
              document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
              document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + hostname;
              
              // Clear for all parent domains (.dev.s2s.ai, .s2s.ai, etc.)
              for (let i = 0; i < parts.length - 1; i++) {
                const domain = parts.slice(i).join('.');
                document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.' + domain;
                document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + domain;
              }
            }
          });
          
          // Verify cookies are cleared
          const remainingCookies = document.cookie.split(';').filter(c => c.trim()).length;
          return 'CLEARED_' + (allCookies.length - remainingCookies) + '_COOKIES';
        }`,
      },
    });
    
    console.log('   ✅ Browser session cleared');
  }

  /**
   * Refresh access token using refresh_token via Auth0 OAuth endpoint
   */
  async refreshAccessToken(
    auth0Domain: string,
    clientId: string,
    clientSecret: string,
    refreshToken: string
  ): Promise<Auth0TokenResponse> {
    try {
      console.log('🔄 Refreshing access token from refresh_token...');

      const response = await axios.post<Auth0TokenResponse>(
        `${auth0Domain}/oauth/token`,
        {
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      console.log(`✅ Access token refreshed (expires in ${response.data.expires_in}s)`);
      return response.data;
    } catch (error) {
      const errorMsg = axios.isAxiosError(error)
        ? `${error.response?.status}: ${JSON.stringify(error.response?.data)}`
        : error instanceof Error
        ? error.message
        : String(error);
      throw new Error(`Failed to refresh access token: ${errorMsg}`);
    }
  }

  /**
   * Login via browser automation AND get access token via Password Grant
   * Returns the access token for use in Authorization: Bearer headers
   * This mimics how the real frontend works!
   */
  async login(
    loginUrl: string,
    email: string,
    password: string,
    auth0Domain: string,
    clientId: string,
    clientSecret: string
  ): Promise<string> {
    if (!this.client) {
      throw new Error('MCP client not connected. Call connect() first.');
    }

    console.log(`🔐 Logging in as ${email}...`);

    try {
      // Navigate to login page (fresh browser instance = no Auth0 SSO)
      console.log(`   🔗 Navigating to login page...`);
      await this.client.callTool({
        name: 'browser_navigate',
        arguments: { url: loginUrl },
      });

      // Wait for Auth0 redirect and page load
      await this.client.callTool({
        name: 'browser_wait_for',
        arguments: { time: 5 },
      });

      // Check what page we're actually on
      const urlCheck = await this.client.callTool({
        name: 'browser_evaluate',
        arguments: {
          function: `() => window.location.href`,
        },
      });
      
      const urlContent = urlCheck.content as Array<{ text?: string }> | undefined;
      let currentUrl = urlContent?.[0]?.text || '';
      if (currentUrl.includes('### Result')) {
        const lines = currentUrl.split('\n');
        const resultIndex = lines.findIndex(line => line.startsWith('### Result'));
        if (resultIndex !== -1 && lines[resultIndex + 1]) {
          currentUrl = lines[resultIndex + 1].trim().replace(/^["']|["']$/g, '');
        }
      }
      
      console.log(`   🌐 Current URL: ${currentUrl}`);

      // Wait longer for the form to be ready
      await this.client.callTool({
        name: 'browser_wait_for',
        arguments: { time: 3 },
      });

      // Use browser_evaluate to directly fill the form (more reliable for Auth0)
      // Escape values for safe JavaScript string interpolation
      const escapedEmail = email.replace(/'/g, "\\'").replace(/"/g, '\\"');
      const escapedPassword = password.replace(/'/g, "\\'").replace(/"/g, '\\"');
      
      console.log(`   📧 Checking for login form fields...`);
      const fillToolResult = await this.client.callTool({
        name: 'browser_evaluate',
        arguments: {
          function: `() => {
            const email = '${escapedEmail}';
            const password = '${escapedPassword}';
            
            // Check what page we're on
            const url = window.location.href;
            
            // Wait for fields to be available
            const emailField = document.getElementById('username');
            const passwordField = document.getElementById('password');
            
            if (!emailField || !passwordField) {
              // Get some debug info
              const pageTitle = document.title;
              const hasLoginForm = document.querySelector('form') !== null;
              const allInputs = Array.from(document.querySelectorAll('input')).map(i => i.id || i.name || i.type);
              return JSON.stringify({
                status: 'FIELDS_NOT_FOUND',
                url: url,
                title: pageTitle,
                hasForm: hasLoginForm,
                inputs: allInputs
              });
            }
            
            // Fill email field
            emailField.value = email;
            emailField.dispatchEvent(new Event('input', { bubbles: true }));
            emailField.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Fill password field
            passwordField.value = password;
            passwordField.dispatchEvent(new Event('input', { bubbles: true }));
            passwordField.dispatchEvent(new Event('change', { bubbles: true }));
            
            return JSON.stringify({ status: 'SUCCESS' });
          }`,
        },
      });
      
      const fillContent = fillToolResult.content as Array<{ text?: string }> | undefined;
      let fillStatus = fillContent?.[0]?.text || '{}';
      
      // Parse MCP response
      if (fillStatus.includes('### Result')) {
        const lines = fillStatus.split('\n');
        const resultIndex = lines.findIndex(line => line.startsWith('### Result'));
        if (resultIndex !== -1 && lines[resultIndex + 1]) {
          fillStatus = lines[resultIndex + 1].trim();
        }
      }
      
      // Remove surrounding quotes if present
      fillStatus = fillStatus.replace(/^["']|["']$/g, '');
      
      // Unescape the JSON string (MCP returns escaped JSON in a string)
      fillStatus = fillStatus.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      
      let fillResult;
      try {
        fillResult = JSON.parse(fillStatus);
      } catch (parseError) {
        console.log(`   ❌ Failed to parse form check result: ${fillStatus.substring(0, 200)}`);
        throw new Error(`Form check failed: ${fillStatus.substring(0, 100)}`);
      }
      
      if (fillResult.status === 'FIELDS_NOT_FOUND') {
        console.log(`   ❌ Page title: ${fillResult.title}`);
        console.log(`   ❌ URL: ${fillResult.url}`);
        console.log(`   ❌ Has form: ${fillResult.hasForm}`);
        console.log(`   ❌ Available inputs: ${fillResult.inputs.join(', ')}`);
        throw new Error('Login form fields not found. Already logged in or redirected to app homepage.');
      }
      
      console.log(`   ✅ Form filled successfully`);

      await this.client.callTool({
        name: 'browser_wait_for',
        arguments: { time: 1 },
      });

      // Submit the form using JavaScript
      console.log('   🖱️  Submitting form...');
      await this.client.callTool({
        name: 'browser_evaluate',
        arguments: {
          function: `() => {
            const submitButton = document.querySelector('button[type="submit"]');
            if (!submitButton) throw new Error('Submit button not found');
            submitButton.click();
            return 'Form submitted';
          }`,
        },
      });

      // Wait for redirect/navigation
      console.log('⏳ Waiting for redirect and authentication...');
      await this.client.callTool({
        name: 'browser_wait_for',
        arguments: { time: 3 },
      });
      
      // Check URL for tokens in hash or query params (Auth0 might return them here)
      const callbackUrlCheck = await this.client.callTool({
        name: 'browser_evaluate',
        arguments: {
          function: `() => {
            return JSON.stringify({
              href: window.location.href,
              hash: window.location.hash,
              search: window.location.search
            });
          }`,
        },
      });
      
      const callbackContent = callbackUrlCheck.content as Array<{ text?: string }> | undefined;
      let callbackRaw = callbackContent?.[0]?.text || '{}';
      if (callbackRaw.includes('### Result')) {
        const lines = callbackRaw.split('\n');
        const resultIndex = lines.findIndex(line => line.startsWith('### Result'));
        if (resultIndex !== -1 && lines[resultIndex + 1]) {
          callbackRaw = lines[resultIndex + 1].trim();
        }
      }
      callbackRaw = callbackRaw.replace(/^["']|["']$/g, '').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      const callbackInfo = JSON.parse(callbackRaw);
      
      console.log(`   🌐 Callback URL: ${callbackInfo.href}`);
      console.log(`   🔗 Hash: ${callbackInfo.hash}`);
      console.log(`   🔗 Search: ${callbackInfo.search}`);
      
      // Wait a bit more for any final redirects
      await this.client.callTool({
        name: 'browser_wait_for',
        arguments: { time: 2 },
      });

      // Verify we're logged in
      const finalUrlCheck = await this.client.callTool({
        name: 'browser_evaluate',
        arguments: {
          function: `() => window.location.href`,
        },
      });

      const finalUrlContent = finalUrlCheck.content as Array<{ text?: string }> | undefined;
      let finalUrl = finalUrlContent?.[0]?.text || '';
      
      // Parse MCP response
      if (finalUrl.includes('### Result')) {
        const lines = finalUrl.split('\n');
        const resultIndex = lines.findIndex(line => line.startsWith('### Result'));
        if (resultIndex !== -1 && lines[resultIndex + 1]) {
          finalUrl = lines[resultIndex + 1].trim().replace(/^["']|["']$/g, '');
        }
      }
      
      if (finalUrl.includes('/login') || finalUrl.includes('auth0.com')) {
        throw new Error('Login failed - still on login page');
      }

      console.log(`✅ Successfully logged in via browser`);
      
      // Now get the access token via Password Grant (same way the frontend gets it from Auth0)
      console.log(`🔑 Getting access token from Auth0...`);
      const accessToken = await this.getPasswordGrantToken(
        auth0Domain,
        clientId,
        clientSecret,
        email,
        password
      );
      
      console.log(`✅ Access token received: ${accessToken.substring(0, 30)}...`);
      return accessToken;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Login failed for ${email}: ${errorMessage}`);
    }
  }
  
  /**
   * Get access token using Auth0 Password Grant (Resource Owner Password) flow
   * This is used when tokens are in httpOnly cookies and cannot be extracted
   */
  async getPasswordGrantToken(
    auth0Domain: string,
    clientId: string,
    clientSecret: string,
    userEmail: string,
    userPassword: string
  ): Promise<string> {
    try {
      const response = await axios.post<{ access_token: string; token_type: string; expires_in: number }>(
        `${auth0Domain}/oauth/token`,
        {
          grant_type: 'password',
          username: userEmail,
          password: userPassword,
          client_id: clientId,
          client_secret: clientSecret,
          audience: 'https://api.detections.ai',  // Your API identifier
          scope: 'openid profile email offline_access'
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      return response.data.access_token;
    } catch (error) {
      const errorMsg = axios.isAxiosError(error)
        ? `${error.response?.status}: ${JSON.stringify(error.response?.data)}`
        : error instanceof Error
        ? error.message
        : String(error);
      throw new Error(`Auth0 password grant failed: ${errorMsg}`);
    }
  }

  /**
   * Make an authenticated API call from the browser context
   * The browser automatically includes httpOnly cookies - just like a real user!
   */
  async makeApiCall(url: string, method: string, body?: any): Promise<any> {
    if (!this.client) {
      throw new Error('MCP client not connected. Call connect() first.');
    }

    // Escape URL and method for safe string interpolation
    const escapedUrl = url.replace(/'/g, "\\'").replace(/"/g, '\\"');
    const escapedMethod = method.replace(/'/g, "\\'");
    
    // Serialize body to JSON string (will be parsed in the browser context)
    const bodyJson = body ? JSON.stringify(body) : null;
    // Escape the JSON string for safe interpolation
    const escapedBodyJson = bodyJson ? bodyJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"') : null;

    const result = await this.client.callTool({
      name: 'browser_evaluate',
      arguments: {
        function: `async () => {
          try {
            const bodyData = ${escapedBodyJson ? `JSON.parse("${escapedBodyJson}")` : 'null'};
            
            console.log('🔍 Making API call:', {
              url: '${escapedUrl}',
              method: '${escapedMethod}',
              bodyPreview: bodyData ? JSON.stringify(bodyData).substring(0, 100) : 'null',
              origin: window.location.origin
            });
            
            const fetchOptions = {
              method: '${escapedMethod}',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              credentials: 'include', // Include httpOnly cookies automatically!
              mode: 'cors' // Explicitly request CORS
            };
            
            if (bodyData) {
              fetchOptions.body = JSON.stringify(bodyData);
            }

            const response = await fetch('${escapedUrl}', fetchOptions);
            
            console.log('✅ API response:', {
              status: response.status,
              ok: response.ok,
              statusText: response.statusText,
              headers: Object.fromEntries([...response.headers.entries()])
            });

            let responseData;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              responseData = await response.json();
            } else {
              responseData = await response.text();
            }

            return JSON.stringify({
              status: response.status,
              ok: response.ok,
              data: responseData,
              headers: {
                contentType: response.headers.get('content-type')
              }
            });
          } catch (error) {
            console.error('❌ API call failed:', {
              error: error.message,
              name: error.name,
              stack: error.stack,
              url: '${escapedUrl}'
            });
            
            return JSON.stringify({
              status: 0,
              ok: false,
              error: error.message || String(error),
              errorName: error.name,
              stack: error.stack
            });
          }
        }`,
      },
    });

    const content = result.content as Array<{ text?: string }> | undefined;
    let rawText = content?.[0]?.text || '{}';

    // Remove MCP formatting
    if (rawText.includes('### Result')) {
      const lines = rawText.split('\n');
      const resultIndex = lines.findIndex(line => line.startsWith('### Result'));
      if (resultIndex !== -1 && lines[resultIndex + 1]) {
        rawText = lines[resultIndex + 1];
      }
    }

    rawText = rawText.trim().replace(/^["']|["']$/g, '');
    
    // Unescape the JSON
    rawText = rawText.replace(/\\"/g, '"').replace(/\\\\/g, '\\');

    let response;
    try {
      response = JSON.parse(rawText);
    } catch (parseError) {
      console.error(`Failed to parse API response:`, rawText.substring(0, 500));
      throw new Error(`Failed to parse API response: ${rawText.substring(0, 200)}`);
    }

    if (!response.ok) {
      const errorDetail = response.error || JSON.stringify(response.data);
      throw new Error(`API call failed with status ${response.status}: ${errorDetail}`);
    }

    return response.data;
  }

  /**
   * Close the MCP client and kill the browser
   * This ensures a fresh session on next connect
   */
  async close() {
    try {
      // Try to close the browser explicitly before disconnecting
      if (this.client) {
        try {
          console.log('   🔒 Closing browser session...');
          await this.client.callTool({
            name: 'browser_close',
            arguments: {},
          });
        } catch (error) {
          // Browser might already be closed, that's fine
        }
      }
    } catch (error) {
      // Ignore errors during cleanup
    }

    // Close the MCP client connection
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.transport) {
      this.transport.close();
      this.transport = null;
    }
  }
}

