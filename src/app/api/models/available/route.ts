import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const hasOpenRouterKey = !!process.env.OPENROUTER_API_KEY
  const hasDeepInfraKey = !!process.env.DEEPINFRA_API_KEY
  const hasAnyKey = hasOpenRouterKey || hasDeepInfraKey
  
  return NextResponse.json({
    available: hasAnyKey,
    openrouter: hasOpenRouterKey,
    deepinfra: hasDeepInfraKey
  })
}
