import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    return NextResponse.redirect(
      `${request.nextUrl.origin}/settings/mcp-servers?error=${encodeURIComponent(error)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${request.nextUrl.origin}/settings/mcp-servers?error=no_code`
    )
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID!,
        client_secret: process.env.GITHUB_CLIENT_SECRET!,
        code,
        redirect_uri: `${request.nextUrl.origin}/api/auth/github-mcp/callback`,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error)
    }

    // Get user info to verify token
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    })

    if (!userResponse.ok) {
      throw new Error('Failed to verify GitHub token')
    }

    const githubUser = await userResponse.json()

    // Store in database
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/login`
      )
    }

    // Create MCP server configuration
    const mcpConfig = {
      servers: {
        github: {
          type: 'http',
          url: 'https://api.githubcopilot.com/mcp/',
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`
          }
        }
      }
    }

    // Create or update the GitHub MCP server
    const { data: server, error: serverError } = await supabase
      .from('mcp_servers')
      .upsert({
        user_id: user.id,
        name: `GitHub (${githubUser.login})`,
        type: 'http',
        url: 'https://api.githubcopilot.com/mcp/',
        config: mcpConfig,
        is_oauth: true,
        oauth_provider: 'github',
        is_active: true,
        last_connected_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,name'
      })
      .select()
      .single()

    if (serverError) {
      throw serverError
    }

    // Store OAuth token (encrypted)
    const { error: tokenError } = await supabase.rpc('update_mcp_oauth_token', {
      p_server_id: server.id,
      p_access_token: tokenData.access_token,
      p_refresh_token: tokenData.refresh_token,
      p_expires_at: tokenData.expires_at ? new Date(tokenData.expires_at).toISOString() : null
    })

    if (tokenError) {
      throw tokenError
    }

    // Trigger tool enumeration in background
    // Don't block the OAuth callback on this
    setTimeout(async () => {
      try {
        const enumResponse = await fetch(`${request.nextUrl.origin}/api/mcp/enumerate-tools`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('Cookie') || '' // Pass cookies for auth
          },
          body: JSON.stringify({ serverId: server.id })
        })
        
        if (!enumResponse.ok) {
          console.error('Tool enumeration failed:', await enumResponse.text())
        }
      } catch (error) {
        console.error('Failed to trigger tool enumeration:', error)
      }
    }, 1000) // Delay by 1 second to ensure database is ready

    return NextResponse.redirect(
      `${request.nextUrl.origin}/settings/mcp-servers?success=github_connected`
    )
  } catch (error) {
    console.error('GitHub MCP OAuth error:', error)
    return NextResponse.redirect(
      `${request.nextUrl.origin}/settings/mcp-servers?error=oauth_failed`
    )
  }
}