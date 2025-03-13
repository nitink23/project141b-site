import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const productLink = searchParams.get("product_link")
  
  console.log(`[Single Product API] Received request for product_link: "${productLink}"`)

  if (!productLink) {
    console.log("[Single Product API] Error: No product_link provided")
    return NextResponse.json({ error: "Product link is required" }, { status: 400 })
  }

  console.log(`[Single Product API] Fetching data from external API for product`)
  
  try {
    const apiUrl = `https://project141b.onrender.com/single-product?product_link=${encodeURIComponent(productLink)}`
    console.log(`[Single Product API] Making request to: ${apiUrl}`)
    
    const startTime = Date.now()
    const response = await fetch(apiUrl)
    const responseTime = Date.now() - startTime
    
    console.log(`[Single Product API] Received response in ${responseTime}ms with status: ${response.status}`)
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log(`[Single Product API] Successfully parsed JSON response for product`)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error("[Single Product API] Error occurred:", error)
    return NextResponse.json({ error: "Failed to fetch product data" }, { status: 500 })
  }
} 