import { generateCode } from '@/tools/code-generation'
import { promises as fs } from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

describe('Code Generation Tool', () => {
  const testDir = path.join(process.cwd(), 'test-output')
  const testFile = 'test-output/test-file.ts'

  beforeEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true })
    } catch {}
    await fs.mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    // Clean up
    try {
      await fs.rm(testDir, { recursive: true, force: true })
    } catch {}
  })

  describe('create action', () => {
    it('should create a new file', async () => {
      const result = await generateCode.execute({
        action: 'create',
        filePath: testFile,
        content: 'export const test = "hello world"',
        description: 'Test file creation'
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('Created')

      // Verify file exists
      const content = await fs.readFile(path.join(process.cwd(), testFile), 'utf-8')
      expect(content).toBe('export const test = "hello world"')
    })

    it('should fail if file already exists', async () => {
      // Create file first
      await fs.writeFile(path.join(process.cwd(), testFile), 'existing content')

      const result = await generateCode.execute({
        action: 'create',
        filePath: testFile,
        content: 'new content',
        description: 'Test duplicate creation'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('already exists')
    })

    it('should create directories if needed', async () => {
      const nestedFile = 'test-output/nested/deep/file.ts'
      
      const result = await generateCode.execute({
        action: 'create',
        filePath: nestedFile,
        content: 'export const nested = true',
        description: 'Test nested file creation'
      })

      expect(result.success).toBe(true)
      
      // Verify file exists
      const exists = await fs.access(path.join(process.cwd(), nestedFile))
        .then(() => true)
        .catch(() => false)
      expect(exists).toBe(true)
    })
  })

  describe('update action', () => {
    it('should update an existing file', async () => {
      // Create file first
      await fs.writeFile(path.join(process.cwd(), testFile), 'old content')

      const result = await generateCode.execute({
        action: 'update',
        filePath: testFile,
        content: 'new content',
        description: 'Test file update'
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('Updated')

      // Verify content
      const content = await fs.readFile(path.join(process.cwd(), testFile), 'utf-8')
      expect(content).toBe('new content')
    })

    it('should fail if file does not exist', async () => {
      const result = await generateCode.execute({
        action: 'update',
        filePath: 'non-existent.ts',
        content: 'content',
        description: 'Test update non-existent'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('does not exist')
    })
  })

  describe('run-test action', () => {
    it('should run a test command', async () => {
      const result = await generateCode.execute({
        action: 'run-test',
        testCommand: 'echo "test passed"',
        description: 'Test command execution'
      })

      expect(result.success).toBe(true)
      expect(result.output).toContain('test passed')
    })

    it('should capture test failures', async () => {
      const result = await generateCode.execute({
        action: 'run-test',
        testCommand: 'exit 1',
        description: 'Test failure capture'
      })

      expect(result.success).toBe(false)
      expect(result.message).toContain('Test failed')
    })
  })

  describe('fix-test action', () => {
    it('should analyze test failures', async () => {
      // Create a simple failing test
      const failingTest = `
import { test, expect } from '@playwright/test'

test('failing test', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('text="Non-existent"')).toBeVisible()
})
`
      await fs.writeFile(
        path.join(process.cwd(), 'test-output/failing.spec.ts'),
        failingTest
      )

      const result = await generateCode.execute({
        action: 'fix-test',
        testCommand: 'echo "TimeoutError: locator(\'text=\\"Non-existent\\"\') timeout"',
        description: 'Test failure analysis'
      })

      expect(result.success).toBe(false)
      expect(result.output).toContain('timeout')
      expect(result.output).toContain('suggestedFixes')
    })

    it('should detect selector errors', async () => {
      const result = await generateCode.execute({
        action: 'fix-test',
        testCommand: 'echo "Error: locator(\'button[type=\\"submit\\"]\') not found"',
        description: 'Test selector error'
      })

      expect(result.success).toBe(false)
      expect(result.output).toContain('selector')
    })
  })

  describe('parameter validation', () => {
    it('should validate required parameters for create', async () => {
      const result = await generateCode.execute({
        action: 'create',
        description: 'Missing parameters'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should validate required parameters for run-test', async () => {
      const result = await generateCode.execute({
        action: 'run-test',
        description: 'Missing test command'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('testCommand')
    })
  })
})