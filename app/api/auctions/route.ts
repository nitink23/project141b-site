import { NextResponse } from "next/server"

export const maxDuration = 60; // Set max duration to 60 seconds for Vercel

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const searchTerm = searchParams.get("search_term")
  
  console.log(`[Auctions API] Received request for search term: "${searchTerm}"`)

  if (!searchTerm) {
    console.log("[Auctions API] Error: No search term provided")
    return NextResponse.json({ error: "Search term is required" }, { status: 400 })
  }

  console.log(`[Auctions API] Fetching data from external API for: "${searchTerm}"`);
  
  try {
    const apiUrl = `https://project141b.onrender.com/auctions?search_term=${encodeURIComponent(searchTerm)}`
    console.log(`[Auctions API] Making request to: ${apiUrl}`)
    
    const startTime = Date.now()
    
    // Use AbortController with a longer timeout (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(apiUrl, {
      signal: controller.signal,
      // Add cache: 'no-store' to prevent caching issues
      cache: 'no-store'
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    const responseTime = Date.now() - startTime
    
    console.log(`[Auctions API] Received response in ${responseTime}ms with status: ${response.status}`)
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log(`[Auctions API] Successfully parsed JSON response with ${data.length} items`)
    
    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error("[Auctions API] Error occurred:", error)
    
    // Check if it's an abort error (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ 
        error: "Request timed out. The backend service may be starting up after inactivity. Please try again in a minute." 
      }, { status: 504 })
    }
    
    return NextResponse.json({ 
      error: "Failed to fetch auction data", 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

