#!/usr/bin/env node
/**
 * Quick script to check auth page structure
 */

import { chromium } from 'playwright'

async function checkAuthPages() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    // Check login page
    console.log('Checking login page...')
    await page.goto('https://hawking-edison.vercel.app/auth/login')
    
    // Find all inputs
    const inputs = await page.$$eval('input', elements => 
      elements.map(el => ({
        type: el.type,
        placeholder: el.placeholder,
        id: el.id,
        name: el.name,
        className: el.className
      }))
    )
    
    console.log('Login page inputs:', JSON.stringify(inputs, null, 2))
    
    // Check buttons
    const buttons = await page.$$eval('button', elements =>
      elements.map(el => ({
        type: el.type,
        text: el.textContent?.trim(),
        className: el.className
      }))
    )
    
    console.log('Login page buttons:', JSON.stringify(buttons, null, 2))
    
    // Check signup page
    console.log('\nChecking signup page...')
    await page.goto('https://hawking-edison.vercel.app/auth/signup')
    
    const signupInputs = await page.$$eval('input', elements => 
      elements.map(el => ({
        type: el.type,
        placeholder: el.placeholder,
        id: el.id
      }))
    )
    
    console.log('Signup page inputs:', JSON.stringify(signupInputs, null, 2))
    
  } finally {
    await browser.close()
  }
}

checkAuthPages().catch(console.error)