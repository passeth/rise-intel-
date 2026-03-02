import Anthropic from '@anthropic-ai/sdk'

let clientInstance: Anthropic | null = null

export function getClaudeClient(): Anthropic {
  if (!clientInstance) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.')
    }
    clientInstance = new Anthropic({ apiKey })
  }
  return clientInstance
}

export function isClaudeConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

export const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

export function extractToolUseResult<T>(
  response: Anthropic.Message,
  toolName: string
): T | null {
  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === 'tool_use' && block.name === toolName
  )

  if (!toolUseBlock) {
    return null
  }

  return toolUseBlock.input as T
}

export function extractTextContent(response: Anthropic.Message): string {
  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  )
  return textBlocks.map((block) => block.text).join('\n')
}
