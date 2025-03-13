import { NextResponse } from "next/server"

// Sample auction data based on the provided format
const generateMockAuctionData = (searchTerm: string, count = 20) => {
  const auctions = []

  const titles = [
    `${searchTerm} - Brand New Sealed`,
    `${searchTerm} - Used Good Condition`,
    `${searchTerm} Pro Model - Refurbished`,
    `${searchTerm} Limited Edition`,
    `${searchTerm} Bundle with Accessories`,
    `Rare ${searchTerm} Collector's Item`,
    `${searchTerm} - Minor Damage`,
    `${searchTerm} - Factory Sealed`,
    `${searchTerm} - Latest Model`,
    `Vintage ${searchTerm} - Working Condition`,
  ]

  const timeLeftOptions = [
    "1h 23m left",
    "4h 40m left",
    "12h 05m left",
    "1d 2h left",
    "2d 15h left",
    "3d 8h left",
    "6h 12m left",
    "8h 45m left",
  ]

  const deliveryCostOptions = [
    "+$15.00 delivery",
    "Free delivery",
    "+$8.99 delivery",
    "+$12.50 delivery",
    "+$5.00 delivery",
    "Free local pickup",
  ]

  const authenticityOptions = ["Authenticity Guarantee", "", "", "", "eBay Refurbished", ""]

  for (let i = 0; i < count; i++) {
    const price = (Math.random() * 1000 + 50).toFixed(2)
    const bidCount = Math.floor(Math.random() * 20)
    const sellerRating = (Math.random() * 10 + 90).toFixed(1)
    const reviewCount = Math.floor(Math.random() * 1000 + 1)

    auctions.push({
      title: titles[Math.floor(Math.random() * titles.length)] + ` #${i + 1}`,
      price: `$${price}`,
      product_link: `https://www.ebay.com/itm/${Math.floor(Math.random() * 1000000000)}`,
      bid_count: `${bidCount} bid${bidCount !== 1 ? "s" : ""} ·`,
      time_left: timeLeftOptions[Math.floor(Math.random() * timeLeftOptions.length)],
      best_offer: Math.random() > 0.8 ? "or Best Offer" : "",
      delivery_cost: deliveryCostOptions[Math.floor(Math.random() * deliveryCostOptions.length)],
      authenticity: authenticityOptions[Math.floor(Math.random() * authenticityOptions.length)],
      product_image: `/placeholder.svg?height=140&width=140&text=${encodeURIComponent(searchTerm)}`,
      seller_info: `seller${i} (${reviewCount}) ${sellerRating}%`,
      seller_name: `seller${i}`,
      seller_no_reviews: `${reviewCount}`,
      seller_rating: `${sellerRating}%`,
    })
  }

  return auctions
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const searchTerm = searchParams.get("search_term")

  if (!searchTerm) {
    return NextResponse.json({ error: "Search term is required" }, { status: 400 })
  }

  try {
    // In a real implementation, we would call the actual API:
    // const response = await fetch(`https://project141b.onrender.com/auctions?search_term=${encodeURIComponent(searchTerm)}`)
    // const data = await response.json()

    // For demonstration, generate mock data
    const auctionData = generateMockAuctionData(searchTerm)

    return NextResponse.json(auctionData)
  } catch (error) {
    console.error("Error in auctions API route:", error)
    return NextResponse.json({ error: "Failed to fetch auction data" }, { status: 500 })
  }
}

