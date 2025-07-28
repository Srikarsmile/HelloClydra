import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'No OpenRouter API key configured' }, { status: 500 })
    }

    // Test multiple models to see what's available
    const testModels = [
      'moonshotai/kimi-k2:free',
      'x-ai/grok-4',
      'meta-llama/llama-3.1-8b-instruct:free',
      'meta-llama/llama-3.2-3b-instruct:free'
    ]
    
    const testResults = []
    
    for (const model of testModels) {
      try {
        const testResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
            'X-Title': 'Clydra AI',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'Hello' }],
            max_tokens: 10
          })
        })
        
        const result = await testResponse.text()
        testResults.push({
          model,
          status: testResponse.status,
          working: testResponse.ok,
          response: result.slice(0, 200)
        })
      } catch (error) {
        testResults.push({
          model,
          status: 'error',
          working: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // Also get available models
    const modelsResponse = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      }
    })
    
    const modelsData = await modelsResponse.json()
    const kimiModels = modelsData.data?.filter((model: any) => 
      model.id.includes('kimi') || model.id.includes('moonshot')
    ) || []

    return NextResponse.json({
      testResults,
      availableKimiModels: kimiModels,
      hasApiKey: !!process.env.OPENROUTER_API_KEY
    })

  } catch (error) {
    console.error('Model test error:', error)
    return NextResponse.json({ 
      error: 'Failed to test models',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}