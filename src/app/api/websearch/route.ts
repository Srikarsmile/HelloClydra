import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { OpenAI } from 'openai'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!process.env.EXA_API_KEY) {
      return NextResponse.json({ 
        error: 'EXA_API_KEY not configured',
        status: 'missing_key'
      }, { status: 500 })
    }

    const body = await request.json()
    const { query, options = {} } = body

    if (!query?.trim()) {
      return NextResponse.json({ 
        error: 'Query is required',
        status: 'invalid_request'
      }, { status: 400 })
    }

    console.log('🔍 Websearch API - Processing query:', query)
    
    const searchPromise = (async () => {
      // Try the new Exa chat completions API first
      try {
        const client = new OpenAI({
          baseURL: "https://api.exa.ai",
          apiKey: process.env.EXA_API_KEY!,
        })

        const stream = await client.chat.completions.create({
          model: "exa",
          messages: [{
            role: "user",
            content: query
          }],
          stream: true
        })

        let searchResultContent = ""
        for await (const chunk of stream) {
          const content = chunk.choices?.[0]?.delta?.content
          if (content) {
            searchResultContent += content
          }
        }

        // Parse the response and format it as search results
        // The Exa chat completion returns formatted search results
        return {
          results: [{
            title: `Search Results for: ${query}`,
            url: 'https://api.exa.ai',
            text: searchResultContent,
            summary: searchResultContent.substring(0, 200) + '...',
            highlights: [searchResultContent.substring(0, 150)],
            publishedDate: new Date().toISOString()
          }]
        }
        
      } catch (chatError) {
        console.log('Exa chat completions not available, falling back to search API:', chatError)
        
        // Fallback to traditional search API
        const Exa = (await import('exa-js')).default
        const exa = new Exa(process.env.EXA_API_KEY!)
        
        // Determine search parameters based on query type
        const isDateQuery = /\b(today|yesterday|this week|this month|latest|recent|current|now|2024|2025|what.*date|when.*is)\b/i.test(query)
        const isNewsQuery = /\b(news|breaking|update|announcement|development|happening)\b/i.test(query)
        
        const searchParams: any = {
          type: options.searchType || 'auto',
          numResults: options.numResults || (isDateQuery || isNewsQuery ? 5 : 3),
          text: true,
          highlights: {
            numSentences: options.highlightSentences || 2,
            highlightsPerUrl: options.highlightsPerUrl || 2,
            query: query
          }
        }
        
        // Add date filters for recent queries
        if (isDateQuery || isNewsQuery) {
          const daysBack = options.daysBack || 7
          const dateThreshold = new Date()
          dateThreshold.setDate(dateThreshold.getDate() - daysBack)
          searchParams.startPublishedDate = dateThreshold.toISOString()
          
          if (isNewsQuery) {
            searchParams.category = 'news'
          }
        }
        
        // Add domain filters if specified
        if (options.includeDomains && Array.isArray(options.includeDomains)) {
          searchParams.includeDomains = options.includeDomains
        }
        
        if (options.excludeDomains && Array.isArray(options.excludeDomains)) {
          searchParams.excludeDomains = options.excludeDomains
        }
        
        return await exa.searchAndContents(query, searchParams)
      }
    })()

    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Search timeout')), options.timeout || 10000)
    )

    const searchResponse = await Promise.race([searchPromise, timeoutPromise])
    
    console.log('Search response received:', {
      resultsCount: searchResponse?.results?.length || 0,
      hasResults: !!searchResponse?.results,
      queryType: {
        isDateQuery: /\b(today|yesterday|this week|this month|latest|recent|current|now|2024|2025)\b/i.test(query),
        isNewsQuery: /\b(news|breaking|update|announcement|development|happening)\b/i.test(query)
      }
    })

    if (searchResponse?.results && Array.isArray(searchResponse.results) && searchResponse.results.length > 0) {
      const currentDate = new Date().toISOString()
      
      const formattedResults = searchResponse.results.map((result: any, index: number) => {
        const publishedDate = result.publishedDate ? new Date(result.publishedDate) : null
        const isRecent = publishedDate ? (Date.now() - publishedDate.getTime()) < (7 * 24 * 60 * 60 * 1000) : false
        
        return {
          index: index + 1,
          title: result.title || 'Untitled',
          url: result.url || 'Unknown source',
          publishedDate: publishedDate?.toISOString() || null,
          publishedDateFormatted: publishedDate?.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }) || null,
          isRecent,
          author: result.author || null,
          highlights: result.highlights || [],
          text: result.text || null,
          textPreview: result.text ? result.text.substring(0, 300) + (result.text.length > 300 ? '...' : '') : null,
          score: result.score || null
        }
      })

      return NextResponse.json({
        status: 'success',
        query,
        searchDate: currentDate,
        results: formattedResults,
        totalResults: searchResponse.results.length,
        metadata: {
          searchType: (searchResponse as any)?.resolvedSearchType || 'auto',
          requestId: (searchResponse as any)?.requestId || null,
          cost: (searchResponse as any)?.costDollars || null
        }
      })
    } else {
      return NextResponse.json({
        status: 'no_results',
        query,
        searchDate: new Date().toISOString(),
        message: 'Search completed but no results found',
        results: [],
        totalResults: 0
      })
    }

  } catch (error) {
    console.error('Websearch API error:', error)
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Websearch request failed'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  const numResults = request.nextUrl.searchParams.get('numResults')
  const daysBack = request.nextUrl.searchParams.get('daysBack')
  
  if (!query) {
    return NextResponse.json({ 
      error: 'Query parameter "q" is required',
      status: 'invalid_request'
    }, { status: 400 })
  }

  // Convert GET to POST format
  const body = {
    query,
    options: {
      numResults: numResults ? parseInt(numResults) : undefined,
      daysBack: daysBack ? parseInt(daysBack) : undefined
    }
  }

  // Create a new request object for the POST handler
  const postRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  return POST(postRequest)
}