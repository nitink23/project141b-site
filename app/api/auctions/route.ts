import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const searchTerm = searchParams.get("search_term")
  
  console.log(`[Auctions API] Received request for search term: "${searchTerm}"`)

  if (!searchTerm) {
    console.log("[Auctions API] Error: No search term provided")
    return NextResponse.json({ error: "Search term is required" }, { status: 400 })
  }

  console.log(`[Auctions API] Fetching data from external API for: "${searchTerm}"`)
  
  try {
    const apiUrl = `https://project141b.onrender.com/auctions?search_term=${encodeURIComponent(searchTerm)}`
    console.log(`[Auctions API] Making request to: ${apiUrl}`)
    
    const startTime = Date.now()
    const response = await fetch(apiUrl)
    const responseTime = Date.now() - startTime
    
    console.log(`[Auctions API] Received response in ${responseTime}ms with status: ${response.status}`)
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log(`[Auctions API] Successfully parsed JSON response with ${data.length} items`)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error("[Auctions API] Error occurred:", error)
    return NextResponse.json({ error: "Failed to fetch auction data" }, { status: 500 })
  }
}

