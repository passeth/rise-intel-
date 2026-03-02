'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('prose prose-sm max-w-none dark:prose-invert', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Override default elements for better Tailwind integration
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-[#1A1A1A] mt-6 mb-3 pb-2 border-b border-gray-200">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-[#1A1A1A] mt-5 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-[#333333] mt-4 mb-2">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-sm text-[#444444] leading-relaxed mb-3">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 text-sm text-[#444444] mb-3 ml-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 text-sm text-[#444444] mb-3 ml-2">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-sm text-[#444444]">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-[#1A1A1A]">{children}</strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-200 bg-blue-50/50 pl-4 py-2 my-3 text-sm text-[#555555] italic">
              {children}
            </blockquote>
          ),
          code: ({ children, className: codeClassName }) => {
            const isInline = !codeClassName
            return isInline ? (
              <code className="bg-gray-100 text-[#c7254e] px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
            ) : (
              <code className={cn('block bg-gray-50 p-3 rounded-md text-xs font-mono overflow-x-auto border border-gray-100', codeClassName)}>
                {children}
              </code>
            )
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full text-sm border border-gray-200 rounded-md">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 border-b border-gray-200">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-sm text-[#444444] border-b border-gray-100">{children}</td>
          ),
          hr: () => <hr className="my-4 border-gray-200" />,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
