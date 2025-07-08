import { Page } from '@playwright/test'

/**
 * Browser-specific debugging utilities
 */

/**
 * Log browser console messages for debugging
 */
export function setupConsoleLogging(page: Page) {
  page.on('console', (msg) => {
    const type = msg.type()
    const text = msg.text()
    
    // Log errors and warnings
    if (type === 'error' || type === 'warning') {
      console.log(`[${type.toUpperCase()}] ${text}`)
      
      // Log additional details for errors
      if (type === 'error') {
        msg.args().forEach(async (arg) => {
          try {
            const value = await arg.jsonValue()
            console.log('  Error details:', value)
          } catch {
            // Ignore if can't serialize
          }
        })
      }
    }
  })
  
  // Log page errors
  page.on('pageerror', (error) => {
    console.log('[PAGE ERROR]', error.message)
    console.log('  Stack:', error.stack)
  })
  
  // Log failed requests
  page.on('requestfailed', (request) => {
    console.log('[REQUEST FAILED]', request.url())
    console.log('  Failure:', request.failure()?.errorText)
  })
}

/**
 * Check for React hydration errors
 */
export async function checkForHydrationErrors(page: Page): Promise<string[]> {
  const errors = await page.evaluate(() => {
    const logs: string[] = []
    const originalError = console.error
    
    // Temporarily override console.error to capture hydration warnings
    console.error = (...args) => {
      const message = args.join(' ')
      if (message.includes('hydration') || 
          message.includes('did not match') || 
          message.includes('Text content does not match')) {
        logs.push(message)
      }
      originalError.apply(console, args)
    }
    
    // Restore after a moment
    setTimeout(() => {
      console.error = originalError
    }, 5000)
    
    return logs
  })
  
  return errors
}

/**
 * Wait for React to be ready (hydrated)
 */
export async function waitForReactReady(page: Page, timeout: number = 10000) {
  // Wait for React to be available
  await page.waitForFunction(() => {
    // Check if React DevTools hook is available
    const hasReact = !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__
    
    // Check if the page has interactive elements
    const hasInteractiveElements = document.querySelectorAll('button, input, a').length > 0
    
    // Check if body has content
    const hasContent = document.body.textContent?.trim().length > 0
    
    return hasReact && hasInteractiveElements && hasContent
  }, { timeout })
  
  // Additional wait for hydration to complete
  await page.waitForTimeout(500)
}

/**
 * Get browser-specific wait times
 */
export function getBrowserWaitTimes(browserName: string) {
  switch (browserName.toLowerCase()) {
    case 'firefox':
      return {
        hydration: 2000,
        navigation: 3000,
        interaction: 1000
      }
    case 'webkit':
    case 'safari':
      return {
        hydration: 1500,
        navigation: 2500,
        interaction: 800
      }
    default: // chromium
      return {
        hydration: 500,
        navigation: 1000,
        interaction: 300
      }
  }
}

/**
 * Debug helper to capture page state
 */
export async function capturePageState(page: Page, label: string) {
  console.log(`\n=== Page State: ${label} ===`)
  console.log('URL:', page.url())
  
  // Get page title
  const title = await page.title()
  console.log('Title:', title)
  
  // Check for visible headings
  const headings = await page.evaluate(() => {
    const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.textContent?.trim())
    const h2s = Array.from(document.querySelectorAll('h2')).map(h => h.textContent?.trim())
    return { h1s, h2s }
  })
  console.log('Headings:', headings)
  
  // Check for form elements
  const formElements = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input').length
    const buttons = document.querySelectorAll('button').length
    const forms = document.querySelectorAll('form').length
    return { inputs, buttons, forms }
  })
  console.log('Form elements:', formElements)
  
  // Check for Mantine components
  const mantineState = await page.evaluate(() => {
    const mantineRoot = document.querySelector('[data-mantine-color-scheme]')
    const mantineInputs = document.querySelectorAll('[class*="mantine-"]').length
    return {
      hasRoot: !!mantineRoot,
      componentCount: mantineInputs
    }
  })
  console.log('Mantine state:', mantineState)
  
  console.log('=== End Page State ===\n')
}

/**
 * Wait for network to be truly idle (stricter than networkidle)
 */
export async function waitForNetworkSettled(page: Page, timeout: number = 5000) {
  let pendingRequests = 0
  
  const onRequest = () => pendingRequests++
  const onResponse = () => pendingRequests--
  const onFailed = () => pendingRequests--
  
  page.on('request', onRequest)
  page.on('response', onResponse)
  page.on('requestfailed', onFailed)
  
  try {
    // Wait for initial requests to complete
    await page.waitForLoadState('networkidle', { timeout })
    
    // Wait for pending requests to reach 0
    await page.waitForFunction(() => {
      return pendingRequests === 0
    }, { timeout: timeout / 2 })
    
    // Additional wait to ensure no new requests start
    await page.waitForTimeout(500)
  } finally {
    page.off('request', onRequest)
    page.off('response', onResponse)
    page.off('requestfailed', onFailed)
  }
}