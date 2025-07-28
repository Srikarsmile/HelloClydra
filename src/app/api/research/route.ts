import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import Exa from 'exa-js'
import { OpenAI } from 'openai'

// Initialize Exa client
const getExaClient = () => {
  if (!process.env.EXA_API_KEY) {
    throw new Error('EXA_API_KEY not configured')
  }
  return new Exa(process.env.EXA_API_KEY)
}

// In-memory task storage (in production, use a proper database)
interface ResearchResult {
  report?: string
  sources?: Array<{
    id: number
    title: string
    url: string
    publishedDate?: string
    author?: string
    summary?: string
    highlights?: string[]
    excerpt?: string
  }>
  summary?: string
  schema?: Record<string, unknown>
  data?: Record<string, unknown>
}

const tasks = new Map<string, {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: ResearchResult
  error?: string
  createdAt: Date
  completedAt?: Date
}>()

// POST /api/research - Create a new research task
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.EXA_API_KEY) {
      return NextResponse.json({ 
        error: 'Exa API key not configured. Please set EXA_API_KEY environment variable.' 
      }, { status: 500 })
    }

    const body = await request.json()
    const { 
      instructions, 
      model = 'exa-research',
      output 
    }: {
      instructions: string
      model?: string
      output?: {
        schema?: Record<string, unknown>
        inferSchema?: boolean
      }
    } = body

    if (!instructions || typeof instructions !== 'string') {
      return NextResponse.json({ 
        error: 'Instructions are required and must be a string' 
      }, { status: 400 })
    }

    if (instructions.length > 4096) {
      return NextResponse.json({ 
        error: 'Instructions must be 4096 characters or less' 
      }, { status: 400 })
    }

    const exa = getExaClient()
    
    // Generate a unique task ID
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Store task as pending
    tasks.set(taskId, {
      id: taskId,
      status: 'pending',
      createdAt: new Date()
    })

    // Start the research task asynchronously
    processResearchTask(taskId, instructions, model, output, exa)
      .catch((error) => {
        console.error(`Research task ${taskId} failed:`, error)
        const task = tasks.get(taskId)
        if (task) {
          task.status = 'failed'
          task.error = error.message
          task.completedAt = new Date()
        }
      })

    return NextResponse.json({ id: taskId }, { status: 201 })

  } catch (error) {
    console.error('Research API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}

// GET /api/research?taskId=xxx - Poll task status
export async function GET(request: NextRequest) {
  try {
    // Use anonymous user (no authentication required)
    const userId = 'anonymous-user'

    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json({ error: 'taskId parameter is required' }, { status: 400 })
    }

    const task = tasks.get(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Return task status and result if completed
    const response: {
      id: string
      status: string
      createdAt: string
      result?: ResearchResult
      completedAt?: string
      error?: string
    } = {
      id: task.id,
      status: task.status,
      createdAt: task.createdAt.toISOString()
    }

    if (task.status === 'completed' && task.result) {
      response.result = task.result
      response.completedAt = task.completedAt?.toISOString()
    }

    if (task.status === 'failed' && task.error) {
      response.error = task.error
      response.completedAt = task.completedAt?.toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Research polling error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}

// Process research task asynchronously
async function processResearchTask(
  taskId: string, 
  instructions: string, 
  model: string,
  output: {
    schema?: Record<string, unknown>
    inferSchema?: boolean
  } | undefined,
  exa: Exa
) {
  const task = tasks.get(taskId)
  if (!task) return

  try {
    task.status = 'running'
    
    // Try to use the new Exa research API with chat completions
    try {
      // Option 1: Use Exa research.createTask API if available
      if (typeof (exa as any).research?.createTask === 'function') {
        const researchTask = await (exa as any).research.createTask({
          instructions,
          model: 'exa-research',
          output: output || { inferSchema: true }
        })
        
        const result = await (exa as any).research.pollTask(researchTask.id)
        
        task.status = 'completed'
        task.result = result
        task.completedAt = new Date()
        return
      }
      
      // Option 2: Use OpenAI-compatible chat completions with Exa
      const openai = new OpenAI({
        apiKey: process.env.EXA_API_KEY!,
        baseURL: "https://api.exa.ai",
      })

      const stream = await openai.chat.completions.create({
        model: "exa-research",
        messages: [
          {
            role: "user",
            content: instructions,
          },
        ],
        stream: true,
      })

      let content = ""
      for await (const chunk of stream) {
        const chunkContent = chunk.choices?.[0]?.delta?.content
        if (chunkContent) {
          content += chunkContent
        }
      }

      task.status = 'completed'
      task.result = { 
        report: content,
        summary: `Research completed: ${instructions.substring(0, 100)}...`
      }
      task.completedAt = new Date()
      return
      
    } catch (researchError) {
      console.log('Exa research API not available, falling back to search:', researchError)
      // Fall through to use search-based approach
    }
    
    // Fallback: Use enhanced search with synthesis
    {
      // Fallback: Use enhanced search with synthesis
      const searchResults = await exa.searchAndContents(instructions, {
        type: 'auto',
        numResults: 8,
        text: true,
        highlights: {
          numSentences: 3,
          highlightsPerUrl: 2,
          query: instructions
        },
        summary: {
          query: `Provide a comprehensive analysis of: ${instructions}`
        }
      })

      // Synthesize research report
      const sources = searchResults.results?.map((result, index: number) => ({
        id: index + 1,
        title: result.title || 'Untitled',
        url: result.url || '',
        publishedDate: result.publishedDate,
        author: result.author,
        summary: result.summary,
        highlights: result.highlights,
        excerpt: result.text?.substring(0, 500) + (result.text && result.text.length > 500 ? '...' : '')
      })) || []

      // Create structured result based on output schema
      let synthesizedResult: ResearchResult

      if (output?.schema) {
        // Try to match the requested schema
        synthesizedResult = await synthesizeToSchema(instructions, sources, output.schema)
      } else if (output?.inferSchema) {
        // Generate schema and result
        synthesizedResult = await synthesizeWithInferredSchema(instructions, sources)
      } else {
        // Generate markdown report
        synthesizedResult = {
          report: generateMarkdownReport(instructions, sources),
          sources: sources,
          summary: searchResults.results?.[0]?.summary || 'Research completed successfully'
        }
      }

      task.status = 'completed'
      task.result = synthesizedResult
      task.completedAt = new Date()
    }
  } catch (error) {
    console.error(`Research task ${taskId} processing error:`, error)
    task.status = 'failed'
    task.error = error instanceof Error ? error.message : 'Unknown error occurred'
    task.completedAt = new Date()
  }
}

// Synthesize results to match provided schema
async function synthesizeToSchema(
  instructions: string, 
  sources: ResearchResult['sources'], 
  schema: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // This is a simplified implementation
  // In a real implementation, you'd use an LLM to generate structured data
  
  if (schema.type === 'object' && schema.properties && sources) {
    const result: Record<string, unknown> = {}
    
    for (const [key, prop] of Object.entries(schema.properties)) {
      const propSchema = prop as { type?: string }
      
      if (propSchema.type === 'string') {
        if (key.includes('summary') || key.includes('answer')) {
          result[key] = sources.map(s => s.summary).filter(Boolean).join('. ').substring(0, 500)
        } else if (key.includes('title')) {
          result[key] = `Research Analysis: ${instructions.substring(0, 50)}...`
        } else {
          result[key] = `Generated content for ${key}`
        }
      } else if (propSchema.type === 'array') {
        result[key] = sources.map(source => ({
          title: source.title,
          source: source.url,
          summary: source.summary
        }))
      }
    }
    
    return result
  }
  
  return { data: 'Schema-based synthesis not fully implemented yet' }
}

// Synthesize with inferred schema
async function synthesizeWithInferredSchema(
  instructions: string, 
  sources: ResearchResult['sources']
): Promise<{ schema: Record<string, unknown>, data: Record<string, unknown> }> {
  return {
    schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        keyFindings: { type: 'array' },
        sources: { type: 'array' }
      }
    },
    data: {
      summary: sources?.map(s => s.summary).filter(Boolean).join('. ').substring(0, 1000) || '',
      keyFindings: sources?.flatMap(s => s.highlights || []).slice(0, 5) || [],
      sources: sources?.map(s => ({ title: s.title, url: s.url })) || []
    }
  }
}

// Generate markdown report
function generateMarkdownReport(instructions: string, sources: ResearchResult['sources']): string {
  const report = [
    `# Research Report: ${instructions}`,
    '',
    `## Executive Summary`,
    '',
    sources && sources.length > 0 
      ? sources[0]?.summary || 'Research completed successfully with multiple sources.'
      : 'No sources found for the given query.',
    '',
    `## Key Findings`,
    '',
    ...(sources || []).flatMap((source, index) => [
      `### ${index + 1}. ${source.title}`,
      '',
      `**Source:** [${source.url}](${source.url})`,
      source.author ? `**Author:** ${source.author}` : '',
      source.publishedDate ? `**Published:** ${source.publishedDate}` : '',
      '',
      source.summary || 'No summary available.',
      '',
      ...(source.highlights || []).map((highlight: string) => `- ${highlight}`),
      '',
      source.excerpt ? `**Excerpt:** ${source.excerpt}` : '',
      '',
      '---',
      ''
    ]),
    `## Sources`,
    '',
    ...(sources || []).map((source, index) => 
      `${index + 1}. [${source.title}](${source.url})${source.author ? ` - ${source.author}` : ''}`
    ),
    '',
    `---`,
    `*Report generated on ${new Date().toISOString()}*`
  ]
  
  return report.filter(line => line !== undefined).join('\n')
} 