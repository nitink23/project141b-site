import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const term = searchParams.get("term")

  if (!term) {
    return NextResponse.json({ error: "Search term is required" }, { status: 400 })
  }

  try {
    const response = await fetch(`https://project141b.onrender.com/scrape?term=${encodeURIComponent(term)}`, {
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "No error details available")
      return NextResponse.json(
        { error: `API responded with status ${response.status}: ${errorText}` },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json({ results: data })
  } catch (error) {
    console.error("Error fetching from eBay API:", error)
    return NextResponse.json({ error: "Failed to fetch data from eBay API" }, { status: 500 })
  }
}

