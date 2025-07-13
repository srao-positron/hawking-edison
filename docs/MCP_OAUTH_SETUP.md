# MCP OAuth Setup Guide

## GitHub OAuth Application Setup

To enable GitHub MCP server integration, you need to create a GitHub OAuth App:

1. **Go to GitHub Developer Settings**
   - Navigate to https://github.com/settings/developers
   - Click "OAuth Apps" in the left sidebar
   - Click "New OAuth App"

2. **Configure the OAuth App**
   - **Application name**: Hawking Edison MCP
   - **Homepage URL**: http://localhost:3000 (for development) or your production URL
   - **Authorization callback URL**: http://localhost:3000/api/auth/github-mcp/callback (for development)
   - **Enable Device Flow**: Leave unchecked

3. **Save and Get Credentials**
   - After creating the app, you'll see:
     - **Client ID**: Copy this value
     - **Client Secret**: Click "Generate a new client secret" and copy the value

4. **Add to Environment Variables**
   ```bash
   # Add to .env.local
   GITHUB_CLIENT_ID=your_client_id_here
   GITHUB_CLIENT_SECRET=your_client_secret_here
   ```

5. **For Production**
   - Create a separate OAuth App with production URLs
   - Update the callback URL to: https://your-domain.com/api/auth/github-mcp/callback

## Testing the Integration

1. **Sign in as a test user**
   ```
   Email: test@hawkingedison.com
   Password: TestUser123!@#
   ```

2. **Navigate to MCP Servers**
   - Go to Settings → MCP Servers
   - Click "GitHub MCP Server" in the Quick Connect section

3. **Authorize the App**
   - You'll be redirected to GitHub
   - Authorize the Hawking Edison app
   - You'll be redirected back to the MCP servers page

4. **Verify Connection**
   - The GitHub MCP server should appear in your list
   - It should show as "Connected" with tool counts

## Current Status

- ✅ Database schema created
- ✅ OAuth flow implemented
- ✅ UI for MCP server management
- ✅ Edge Function for tool enumeration deployed
- ⏳ GitHub OAuth app needs to be created
- ⏳ MCP proxy in Lambda orchestrator (next step)

## Next Steps

1. Create the GitHub OAuth app as described above
2. Test the OAuth flow
3. Implement MCP proxy in the Lambda orchestrator
4. Add MCP tools to the orchestrator's tool registry