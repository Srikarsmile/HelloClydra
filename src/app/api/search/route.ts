import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import Exa from 'exa-js'

// Initialize Exa client
const exa = new Exa(process.env.EXA_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.EXA_API_KEY) {
      return NextResponse.json({ error: 'Exa API key not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { 
      query, 
      type = 'auto',
      numResults = 5,
      category,
      includeDomains,
      excludeDomains,
      includeText,
      excludeText,
      startPublishedDate,
      endPublishedDate,
      includeContent = true
    } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required and must be a string' }, { status: 400 })
    }

    // Build search options
    const searchOptions: Record<string, unknown> = {
      type,
      numResults: Math.min(numResults, 10), // Limit to 10 results
      contents: includeContent ? {
        text: true,
        highlights: {
          numSentences: 2,
          highlightsPerUrl: 1,
          query: query
        },
        summary: {
          query: `Summarize the main points about: ${query}`
        }
      } : undefined
    }

    // Add optional filters
    if (category) searchOptions.category = category
    if (includeDomains && Array.isArray(includeDomains)) searchOptions.includeDomains = includeDomains
    if (excludeDomains && Array.isArray(excludeDomains)) searchOptions.excludeDomains = excludeDomains
    if (includeText && Array.isArray(includeText)) searchOptions.includeText = includeText
    if (excludeText && Array.isArray(excludeText)) searchOptions.excludeText = excludeText
    if (startPublishedDate) searchOptions.startPublishedDate = startPublishedDate
    if (endPublishedDate) searchOptions.endPublishedDate = endPublishedDate

    // Perform search
    const results = includeContent 
      ? await exa.searchAndContents(query, searchOptions)
      : await exa.search(query, searchOptions)

    // Format results for better display  
    const formattedResults = {
      query,
      searchType: (results as { resolvedSearchType?: string }).resolvedSearchType || type,
      numResults: results.results?.length || 0,
      results: results.results?.map((result: unknown) => {
        const searchResult = result as {
          title?: string
          url?: string
          publishedDate?: string
          author?: string
          score?: number
          summary?: string
          highlights?: string[]
          text?: string
        }
        return {
          title: searchResult.title,
          url: searchResult.url,
          publishedDate: searchResult.publishedDate,
          author: searchResult.author,
          score: searchResult.score,
          summary: searchResult.summary,
          highlights: searchResult.highlights,
          text: searchResult.text ? searchResult.text.substring(0, 1000) + (searchResult.text.length > 1000 ? '...' : '') : undefined
        }
      }) || []
    }

    return NextResponse.json({
      success: true,
      data: formattedResults
    })

  } catch (error) {
    console.error('Exa search error:', error)
    
    // Handle specific Exa API errors
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Invalid Exa API key' }, { status: 401 })
      }
      if (error.message.includes('429')) {
        return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 })
      }
      if (error.message.includes('400')) {
        return NextResponse.json({ error: 'Invalid search parameters' }, { status: 400 })
      }
    }

    return NextResponse.json({ 
      error: 'Search failed. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
} 