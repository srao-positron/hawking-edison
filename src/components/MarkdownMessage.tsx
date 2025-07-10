'use client'

import React from 'react'

interface MarkdownMessageProps {
  content: string
  className?: string
}

export default function MarkdownMessage({ content, className = '' }: MarkdownMessageProps) {
  // Basic markdown parsing
  const renderContent = () => {
    // Split content into lines for processing
    const lines = content.split('\n')
    const elements: React.ReactNode[] = []
    let inCodeBlock = false
    let codeBlockContent: string[] = []
    let codeBlockLang = ''
    
    lines.forEach((line, index) => {
      // Code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // End code block
          elements.push(
            <pre key={`code-${index}`} className="bg-gray-100 p-3 rounded-md overflow-x-auto my-2">
              <code className={`language-${codeBlockLang}`}>
                {codeBlockContent.join('\n')}
              </code>
            </pre>
          )
          codeBlockContent = []
          codeBlockLang = ''
          inCodeBlock = false
        } else {
          // Start code block
          inCodeBlock = true
          codeBlockLang = line.slice(3).trim()
        }
        return
      }
      
      if (inCodeBlock) {
        codeBlockContent.push(line)
        return
      }
      
      // Headers
      if (line.startsWith('### ')) {
        elements.push(<h3 key={index} className="text-lg font-semibold mt-4 mb-2">{line.slice(4)}</h3>)
      } else if (line.startsWith('## ')) {
        elements.push(<h2 key={index} className="text-xl font-semibold mt-4 mb-2">{line.slice(3)}</h2>)
      } else if (line.startsWith('# ')) {
        elements.push(<h1 key={index} className="text-2xl font-bold mt-4 mb-2">{line.slice(2)}</h1>)
      }
      // Lists
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li key={index} className="ml-4 list-disc">
            {renderInlineMarkdown(line.slice(2))}
          </li>
        )
      } else if (/^\d+\.\s/.test(line)) {
        elements.push(
          <li key={index} className="ml-4 list-decimal">
            {renderInlineMarkdown(line.replace(/^\d+\.\s/, ''))}
          </li>
        )
      }
      // Blockquote
      else if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={index} className="border-l-4 border-gray-300 pl-4 italic my-2">
            {renderInlineMarkdown(line.slice(2))}
          </blockquote>
        )
      }
      // Horizontal rule
      else if (line === '---' || line === '***') {
        elements.push(<hr key={index} className="my-4 border-gray-300" />)
      }
      // Regular paragraph
      else if (line.trim()) {
        elements.push(
          <p key={index} className="mb-2">
            {renderInlineMarkdown(line)}
          </p>
        )
      }
      // Empty line
      else {
        elements.push(<br key={index} />)
      }
    })
    
    return elements
  }
  
  // Handle inline markdown (bold, italic, code, links)
  const renderInlineMarkdown = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = []
    let remaining = text
    let key = 0
    
    while (remaining) {
      // Bold
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
      const italicMatch = remaining.match(/\*(.+?)\*/)
      const codeMatch = remaining.match(/`(.+?)`/)
      const linkMatch = remaining.match(/\[(.+?)\]\((.+?)\)/)
      
      // Find the earliest match
      const matches = [
        { match: boldMatch, type: 'bold' },
        { match: italicMatch, type: 'italic' },
        { match: codeMatch, type: 'code' },
        { match: linkMatch, type: 'link' }
      ].filter(m => m.match).sort((a, b) => a.match!.index! - b.match!.index!)
      
      if (matches.length === 0) {
        parts.push(remaining)
        break
      }
      
      const first = matches[0]
      const match = first.match!
      
      // Add text before match
      if (match.index! > 0) {
        parts.push(remaining.substring(0, match.index))
      }
      
      // Add formatted text
      switch (first.type) {
        case 'bold':
          parts.push(<strong key={key++}>{match[1]}</strong>)
          remaining = remaining.substring(match.index! + match[0].length)
          break
        case 'italic':
          // Skip if it's part of bold
          if (!remaining.substring(match.index!).startsWith('**')) {
            parts.push(<em key={key++}>{match[1]}</em>)
            remaining = remaining.substring(match.index! + match[0].length)
          } else {
            parts.push(remaining[match.index!])
            remaining = remaining.substring(match.index! + 1)
          }
          break
        case 'code':
          parts.push(
            <code key={key++} className="bg-gray-100 px-1 py-0.5 rounded text-sm">
              {match[1]}
            </code>
          )
          remaining = remaining.substring(match.index! + match[0].length)
          break
        case 'link':
          parts.push(
            <a key={key++} href={match[2]} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              {match[1]}
            </a>
          )
          remaining = remaining.substring(match.index! + match[0].length)
          break
      }
    }
    
    return parts
  }
  
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      {renderContent()}
    </div>
  )
}