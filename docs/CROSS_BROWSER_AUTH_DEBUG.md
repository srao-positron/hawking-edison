# Cross-Browser Authentication Debugging Guide

## Summary of Changes

I've identified and addressed several potential causes for Firefox and WebKit failures on the login page:

### 1. **Missing Mantine SSR Configuration**
- **Issue**: Mantine components weren't properly configured for server-side rendering
- **Fix**: Added `ColorSchemeScript` to the root layout and consolidated MantineProvider
- **Files changed**:
  - `/src/app/layout.tsx` - Added ColorSchemeScript and theme
  - `/src/app/(with-nav)/layout.tsx` - Removed duplicate MantineProvider
  - `/src/app/theme.ts` - Created centralized theme configuration

### 2. **Improved Login Helper**
- **Location**: `/e2e/helpers/login-helper.ts`
- **Features**:
  - Multiple selector strategies for finding elements
  - Browser-specific wait times
  - Retry logic for clicks (Firefox sometimes needs this)
  - Better error handling and fallbacks
  - Waits for React hydration to complete

### 3. **Browser Debugging Utilities**
- **Location**: `/e2e/helpers/browser-debug.ts`
- **Features**:
  - Console logging setup
  - Hydration error detection
  - Page state capture for debugging
  - Browser-specific wait time configurations

### 4. **Cross-Browser Test Suite**
- **Location**: `/e2e/cross-browser/auth-cross-browser.spec.ts`
- **Features**:
  - Comprehensive auth flow testing
  - Multiple strategies for element detection
  - Detailed logging for debugging

## Common Browser-Specific Issues

### Firefox
1. **Slower JavaScript execution** - Needs longer timeouts
2. **Stricter CSP policies** - May block some resources
3. **Different event handling** - Click events may need retry logic
4. **Font loading delays** - Can affect text visibility

### WebKit/Safari
1. **Stricter security** - localStorage/sessionStorage access
2. **Different CSS rendering** - May affect element visibility
3. **Slower hydration** - React components take longer to mount
4. **Form autofill** - Can interfere with tests

## Testing Commands

```bash
# Run the new cross-browser auth tests
npm run test:browser-auth

# Debug a specific browser
npx playwright test e2e/cross-browser/auth-cross-browser.spec.ts --project=firefox --debug

# Run with headed mode to see what's happening
npx playwright test e2e/cross-browser/auth-cross-browser.spec.ts --headed

# Generate trace for debugging
npx playwright test e2e/cross-browser/auth-cross-browser.spec.ts --trace=on
```

## Debugging Steps

1. **Check if Mantine CSS loads correctly**:
   ```javascript
   // In browser console
   document.querySelectorAll('[class*="mantine-"]').length
   ```

2. **Verify React hydration**:
   ```javascript
   // Check if React DevTools are available
   window.__REACT_DEVTOOLS_GLOBAL_HOOK__
   ```

3. **Check for console errors**:
   - Open browser DevTools
   - Look for hydration mismatch warnings
   - Check for failed resource loads

4. **Use the debug helper**:
   ```typescript
   import { capturePageState } from '../helpers/browser-debug'
   await capturePageState(page, 'Debug point')
   ```

## Quick Fixes to Try

1. **Increase global timeouts** in `playwright.config.ts`:
   ```typescript
   use: {
     actionTimeout: 15000,
     navigationTimeout: 45000,
   }
   ```

2. **Add explicit waits** after navigation:
   ```typescript
   await page.goto('/auth/login')
   await page.waitForTimeout(2000) // Give browsers time to settle
   ```

3. **Use more specific selectors**:
   ```typescript
   // Instead of: page.locator('h1')
   // Use: page.locator('h1').filter({ hasText: 'Welcome back!' })
   ```

4. **Force wait for fonts**:
   ```typescript
   await page.waitForFunction(() => document.fonts.ready)
   ```

## Next Steps

1. Run `npm run test:browser-auth` to see if the issues are resolved
2. If issues persist, check the test-results folder for:
   - Screenshots showing the actual page state
   - Videos showing the test execution
   - Trace files for detailed debugging
3. Use `npx playwright show-trace test-results/trace.zip` to analyze failures

## Additional Resources

- [Playwright Cross-Browser Testing](https://playwright.dev/docs/browsers)
- [Mantine SSR Setup](https://mantine.dev/guides/next/)
- [Firefox Developer Tools](https://firefox-source-docs.mozilla.org/devtools-user/)
- [WebKit Web Inspector](https://webkit.org/web-inspector/)