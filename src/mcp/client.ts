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
   * Login via browser automation and return access_token
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
      // Navigate to app first to establish context, then clear everything
      const appBaseUrl = loginUrl.replace('/login', '');
      console.log(`   🧹 Clearing browser data for fresh session...`);
      await this.client.callTool({
        name: 'browser_navigate',
        arguments: { url: appBaseUrl },
      });
      
      await this.client.callTool({
        name: 'browser_wait_for',
        arguments: { time: 1 },
      });
      
      // Clear all browser data
      await this.client.callTool({
        name: 'browser_evaluate',
        arguments: {
          function: `() => {
            // Clear all storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Clear all cookies for current domain and parent domains
            document.cookie.split(';').forEach(cookie => {
              const name = cookie.split('=')[0].trim();
              if (name) {
                // Current domain
                document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + window.location.hostname;
                
                // Parent domains (.s2s.ai, .dev.s2s.ai, etc.)
                const parts = window.location.hostname.split('.');
                for (let i = 0; i < parts.length - 1; i++) {
                  const domain = parts.slice(i).join('.');
                  document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.' + domain;
                }
              }
            });
            
            return 'CLEARED';
          }`,
        },
      });
      
      // Now navigate to login page with clean slate
      console.log(`   🔗 Navigating to login page...`);
      await this.client.callTool({
        name: 'browser_navigate',
        arguments: { url: loginUrl },
      });

      // Wait longer for the Auth0 redirect and page load
      await this.client.callTool({
        name: 'browser_wait_for',
        arguments: { time: 5 },
      });

      // Check current URL
      const initialUrlCheck = await this.client.callTool({
        name: 'browser_evaluate',
        arguments: {
          function: `() => window.location.href`,
        },
      });
      
      const initialUrlContent = initialUrlCheck.content as Array<{ text?: string }> | undefined;
      let currentPageUrl = initialUrlContent?.[0]?.text || '';
      if (currentPageUrl.includes('### Result')) {
        const lines = currentPageUrl.split('\n');
        const resultIndex = lines.findIndex(line => line.startsWith('### Result'));
        if (resultIndex !== -1 && lines[resultIndex + 1]) {
          currentPageUrl = lines[resultIndex + 1].trim().replace(/^["']|["']$/g, '');
        }
      }
      
      console.log(`   🌐 Current page: ${currentPageUrl}`);
      
      // If we're already logged in (on app homepage, not auth0.com), click login button
      if (!currentPageUrl.includes('/login') && !currentPageUrl.includes('auth0.com')) {
        console.log(`   🔄 Already on app page, clicking login button to re-authenticate...`);
        
        // Try to find and click the login button/link
        try {
          // Try clicking a link to /login first
          await this.client.callTool({
            name: 'browser_evaluate',
            arguments: {
              function: `() => {
                const loginLink = document.querySelector('a[href="/login"]') || 
                                 document.querySelector('a[href*="login"]') ||
                                 Array.from(document.querySelectorAll('button, a')).find(el => 
                                   el.textContent?.toLowerCase().includes('login') ||
                                   el.textContent?.toLowerCase().includes('log in') ||
                                   el.textContent?.toLowerCase().includes('sign in')
                                 );
                if (loginLink) {
                  loginLink.click();
                  return 'CLICKED';
                }
                return 'NOT_FOUND';
              }`,
            },
          });
        } catch (clickError) {
          console.log(`   ⚠️  Could not find login button, attempting to navigate to /login...`);
          await this.client.callTool({
            name: 'browser_navigate',
            arguments: { url: `${loginUrl}` },
          });
        }
        
        // Wait for Auth0 redirect
        await this.client.callTool({
          name: 'browser_wait_for',
          arguments: { time: 5 },
        });
        
        // Check if we're now on the login page
        const afterClickUrl = await this.client.callTool({
          name: 'browser_evaluate',
          arguments: {
            function: `() => window.location.href`,
          },
        });
        
        const afterClickContent = afterClickUrl.content as Array<{ text?: string }> | undefined;
        let afterClickPageUrl = afterClickContent?.[0]?.text || '';
        if (afterClickPageUrl.includes('### Result')) {
          const lines = afterClickPageUrl.split('\n');
          const resultIndex = lines.findIndex(line => line.startsWith('### Result'));
          if (resultIndex !== -1 && lines[resultIndex + 1]) {
            afterClickPageUrl = lines[resultIndex + 1].trim().replace(/^["']|["']$/g, '');
          }
        }
        
        console.log(`   🌐 After clicking login: ${afterClickPageUrl}`);
        
        // If still not on auth page, try extracting tokens as fallback
        if (!afterClickPageUrl.includes('/login') && !afterClickPageUrl.includes('auth0.com')) {
          console.log(`   ⚠️  Still on app page after clicking login, extracting existing tokens...`);
        
        // Extract tokens from storage
        const tokenExtract = await this.client.callTool({
          name: 'browser_evaluate',
          arguments: {
            function: `() => {
              const tokens = {
                access_token: null,
                refresh_token: null,
                storage_keys: []
              };
              
              // Check localStorage
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                  tokens.storage_keys.push('localStorage.' + key);
                  const value = localStorage.getItem(key);
                  if (key.includes('access') || key.includes('token')) {
                    if (value && value.length > 20 && value.startsWith('eyJ')) {
                      tokens.access_token = value;
                    }
                  }
                  if (key.includes('refresh')) {
                    if (value && value.length > 20) {
                      tokens.refresh_token = value;
                    }
                  }
                }
              }
              
              // Check sessionStorage
              for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key) {
                  tokens.storage_keys.push('sessionStorage.' + key);
                  const value = sessionStorage.getItem(key);
                  if (key.includes('access') || key.includes('token')) {
                    if (value && value.length > 20 && value.startsWith('eyJ')) {
                      tokens.access_token = value;
                    }
                  }
                  if (key.includes('refresh')) {
                    if (value && value.length > 20) {
                      tokens.refresh_token = value;
                    }
                  }
                }
              }
              
              return JSON.stringify(tokens);
            }`,
          },
        });
        
        const tokenContent = tokenExtract.content as Array<{ text?: string }> | undefined;
        let tokensRaw = tokenContent?.[0]?.text || '{}';
        
        if (tokensRaw.includes('### Result')) {
          const lines = tokensRaw.split('\n');
          const resultIndex = lines.findIndex(line => line.startsWith('### Result'));
          if (resultIndex !== -1 && lines[resultIndex + 1]) {
            tokensRaw = lines[resultIndex + 1].trim().replace(/^["']|["']$/g, '');
          }
        }
        
        const tokens = JSON.parse(tokensRaw);
        
        console.log(`📦 Available storage keys: ${tokens.storage_keys.join(', ')}`);
        
        if (tokens.refresh_token) {
          console.log(`✅ Found refresh_token: ${tokens.refresh_token.substring(0, 30)}...`);
          const tokenResponse = await this.refreshAccessToken(
            auth0Domain,
            clientId,
            clientSecret,
            tokens.refresh_token
          );
          return tokenResponse.access_token;
        }
        
        if (tokens.access_token) {
          console.log(`✅ Found access_token directly: ${tokens.access_token.substring(0, 30)}...`);
          return tokens.access_token;
        }
        
          throw new Error('Already logged in but no tokens found in storage');
        }
        // If we successfully navigated to login/auth page after clicking, continue with login flow below
        currentPageUrl = afterClickPageUrl;
      }
      
      // At this point, we should be on the Auth0 login page
      // Wait a bit longer for the page to stabilize
      await this.client.callTool({
        name: 'browser_wait_for',
        arguments: { time: 3 },
      });

      // Use browser_evaluate to directly fill the form (more reliable for Auth0)
      // Escape values for safe JavaScript string interpolation
      const escapedEmail = email.replace(/'/g, "\\'").replace(/"/g, '\\"');
      const escapedPassword = password.replace(/'/g, "\\'").replace(/"/g, '\\"');
      
      console.log(`   📧 Filling email and password fields...`);
      const fillResult = await this.client.callTool({
        name: 'browser_evaluate',
        arguments: {
          function: `() => {
            const email = '${escapedEmail}';
            const password = '${escapedPassword}';
            
            // Wait for fields to be available
            const emailField = document.getElementById('username');
            const passwordField = document.getElementById('password');
            
            if (!emailField || !passwordField) {
              return 'FIELDS_NOT_FOUND';
            }
            
            // Fill email field
            emailField.value = email;
            emailField.dispatchEvent(new Event('input', { bubbles: true }));
            emailField.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Fill password field
            passwordField.value = password;
            passwordField.dispatchEvent(new Event('input', { bubbles: true }));
            passwordField.dispatchEvent(new Event('change', { bubbles: true }));
            
            return 'SUCCESS';
          }`,
        },
      });
      
      const fillContent = fillResult.content as Array<{ text?: string }> | undefined;
      let fillStatus = fillContent?.[0]?.text || '';
      
      // Parse MCP response
      if (fillStatus.includes('### Result')) {
        const lines = fillStatus.split('\n');
        const resultIndex = lines.findIndex(line => line.startsWith('### Result'));
        if (resultIndex !== -1 && lines[resultIndex + 1]) {
          fillStatus = lines[resultIndex + 1].trim().replace(/^["']|["']$/g, '');
        }
      }
      
      if (fillStatus === 'FIELDS_NOT_FOUND') {
        throw new Error('Login form fields not found - page may still be loading');
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
        arguments: { time: 5 },
      });

      // Verify we're logged in
      const urlCheck = await this.client.callTool({
        name: 'browser_evaluate',
        arguments: {
          function: `() => window.location.href`,
        },
      });

      const urlContent = urlCheck.content as Array<{ text?: string }> | undefined;
      let currentUrl = urlContent?.[0]?.text || '';
      
      // Parse MCP response
      if (currentUrl.includes('### Result')) {
        const lines = currentUrl.split('\n');
        const resultIndex = lines.findIndex(line => line.startsWith('### Result'));
        if (resultIndex !== -1 && lines[resultIndex + 1]) {
          currentUrl = lines[resultIndex + 1].trim().replace(/^["']|["']$/g, '');
        }
      }
      
      if (currentUrl.includes('/login') || currentUrl.includes('auth0.com')) {
        throw new Error('Login failed - still on login page');
      }

      console.log(`✅ Successfully logged in as ${email}`);
      
      // Look for access_token and refresh_token in storage
      console.log(`🔍 Looking for access_token and refresh_token...`);
      const tokenExtract = await this.client.callTool({
        name: 'browser_evaluate',
        arguments: {
          function: `() => {
            const tokens = {
              access_token: null,
              refresh_token: null,
              storage_keys: []
            };
            
            // Check localStorage
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key) {
                tokens.storage_keys.push('localStorage.' + key);
                const value = localStorage.getItem(key);
                if (key.includes('access') || key.includes('token')) {
                  if (value && value.length > 20 && value.startsWith('eyJ')) {
                    tokens.access_token = value;
                  }
                }
                if (key.includes('refresh')) {
                  if (value && value.length > 20) {
                    tokens.refresh_token = value;
                  }
                }
              }
            }
            
            // Check sessionStorage
            for (let i = 0; i < sessionStorage.length; i++) {
              const key = sessionStorage.key(i);
              if (key) {
                tokens.storage_keys.push('sessionStorage.' + key);
                const value = sessionStorage.getItem(key);
                if (key.includes('access') || key.includes('token')) {
                  if (value && value.length > 20 && value.startsWith('eyJ')) {
                    tokens.access_token = value;
                  }
                }
                if (key.includes('refresh')) {
                  if (value && value.length > 20) {
                    tokens.refresh_token = value;
                  }
                }
              }
            }
            
            return JSON.stringify(tokens);
          }`,
        },
      });
      
      const tokenContent = tokenExtract.content as Array<{ text?: string }> | undefined;
      let tokensRaw = tokenContent?.[0]?.text || '{}';
      
      // Parse MCP response
      if (tokensRaw.includes('### Result')) {
        const lines = tokensRaw.split('\n');
        const resultIndex = lines.findIndex(line => line.startsWith('### Result'));
        if (resultIndex !== -1 && lines[resultIndex + 1]) {
          tokensRaw = lines[resultIndex + 1].trim().replace(/^["']|["']$/g, '');
        }
      }
      
      const tokens = JSON.parse(tokensRaw);
      
      console.log(`📦 Available storage keys: ${tokens.storage_keys.join(', ')}`);
      
      // If we found refresh_token, use it to get access_token
      if (tokens.refresh_token) {
        console.log(`✅ Found refresh_token: ${tokens.refresh_token.substring(0, 30)}...`);
        
        const tokenResponse = await this.refreshAccessToken(
          auth0Domain,
          clientId,
          clientSecret,
          tokens.refresh_token
        );
        
        return tokenResponse.access_token;
      }
      
      // If we found access_token directly, use it
      if (tokens.access_token) {
        console.log(`✅ Found access_token directly: ${tokens.access_token.substring(0, 30)}...`);
        return tokens.access_token;
      }
      
      // No tokens found
      throw new Error('No access_token or refresh_token found in storage after login. They might be in httpOnly cookies.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Login failed for ${email}: ${errorMessage}`);
    }
  }

  /**
   * Make an authenticated API call from the browser context
   * The browser automatically includes auth cookies
   */
  async makeApiCall(url: string, method: string, body?: any): Promise<any> {
    if (!this.client) {
      throw new Error('MCP client not connected. Call connect() first.');
    }

    const escapedUrl = url.replace(/'/g, "\\'");
    const escapedMethod = method.replace(/'/g, "\\'");
    const bodyJson = body ? JSON.stringify(body).replace(/'/g, "\\'") : 'null';

    const result = await this.client.callTool({
      name: 'browser_evaluate',
      arguments: {
        function: `async () => {
          try {
            const response = await fetch('${escapedUrl}', {
              method: '${escapedMethod}',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: ${bodyJson ? `'${bodyJson}'` : 'null'},
              credentials: 'include' // Include cookies
            });

            let responseData;
            try {
              responseData = await response.json();
            } catch (e) {
              responseData = await response.text();
            }

            return JSON.stringify({
              status: response.status,
              ok: response.ok,
              data: responseData
            });
          } catch (error) {
            return JSON.stringify({
              status: 0,
              ok: false,
              error: error.message || String(error)
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

    let response;
    try {
      response = JSON.parse(rawText);
    } catch (parseError) {
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

