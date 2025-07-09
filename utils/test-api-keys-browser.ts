#\!/usr/bin/env npx tsx
// Test API keys with browser-like authentication flow
import { chromium } from "playwright"

async function testBrowserAuth() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  
  try {
    console.log("Testing API Keys with Browser Authentication")
    console.log("===========================================\n")
    
    // Navigate to login page
    console.log("1. Navigating to login page...")
    await page.goto("http://localhost:3001/auth/login")
    await page.waitForLoadState("networkidle")
    
    // Fill in login form
    console.log("2. Filling login form...")
    await page.fill("input[placeholder=\"your@email.com\"]", "test@hawkingedison.com")
    await page.fill("input[type=\"password\"]", "test123456")
    
    // Submit form
    console.log("3. Submitting login...")
    await page.click("button[type=\"submit\"]")
    
    // Wait for navigation or error
    try {
      await page.waitForURL("**/chat", { timeout: 10000 })
      console.log("✓ Successfully logged in and redirected to chat")
    } catch (e) {
      // Check for error
      const errorAlert = await page.locator("[role=\"alert\"]").textContent()
      if (errorAlert) {
        console.error("✗ Login failed:", errorAlert)
        
        // Try to create user
        console.log("\n4. Attempting to create user...")
        await page.goto("http://localhost:3001/auth/signup")
        await page.waitForLoadState("networkidle")
        
        await page.fill("input[placeholder=\"your@email.com\"]", "test@hawkingedison.com")
        await page.fill("input[type=\"password\"]", "test123456")
        await page.click("button[type=\"submit\"]")
        
        // Wait for result
        await page.waitForTimeout(2000)
        
        // Try login again
        console.log("5. Retrying login...")
        await page.goto("http://localhost:3001/auth/login")
        await page.fill("input[placeholder=\"your@email.com\"]", "test@hawkingedison.com")
        await page.fill("input[type=\"password\"]", "test123456")
        await page.click("button[type=\"submit\"]")
        await page.waitForTimeout(2000)
      }
    }
    
    // Get cookies
    console.log("\n6. Checking cookies...")
    const cookies = await context.cookies()
    const authCookies = cookies.filter(c => c.name.includes("auth-token"))
    console.log(`Found ${authCookies.length} auth cookies`)
    authCookies.forEach(c => {
      console.log(`  ${c.name}: ${c.value.substring(0, 50)}...`)
    })
    
    // Test API endpoint
    console.log("\n7. Testing /api/api-keys endpoint...")
    const apiResponse = await page.evaluate(async () => {
      const response = await fetch("/api/api-keys", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      })
      const data = await response.json()
      return { status: response.status, data }
    })
    
    console.log(`API Response Status: ${apiResponse.status}`)
    console.log("API Response:", JSON.stringify(apiResponse.data, null, 2))
    
    // Test direct auth check
    console.log("\n8. Testing /api/test-auth endpoint...")
    const authResponse = await page.evaluate(async () => {
      const response = await fetch("/api/test-auth", {
        method: "GET",
        credentials: "include"
      })
      const data = await response.json()
      return { status: response.status, data }
    })
    
    console.log(`Auth Response Status: ${authResponse.status}`)
    console.log("Auth Response:", JSON.stringify(authResponse.data, null, 2))
    
  } catch (error) {
    console.error("Test failed:", error)
  } finally {
    await browser.close()
    console.log("\n✓ Test completed")
  }
}

testBrowserAuth().catch(console.error)
