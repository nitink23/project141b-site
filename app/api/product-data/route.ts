import { NextResponse } from "next/server"

// Mock product data since we can't actually call the real API in this environment
const generateMockProductData = (productLink: string) => {
  // Generate random data for demonstration
  const numImages = Math.floor(Math.random() * 4) + 1
  const images = Array(numImages)
    .fill(0)
    .map((_, i) => `/placeholder.svg?height=200&width=200&text=Image${i + 1}`)

  const watchers = Math.random() > 0.3 ? `${Math.floor(Math.random() * 50) + 1} watchers` : ""

  const conditions = ["New", "Used - Like New", "Used - Very Good", "Used - Good", "Used - Acceptable"]
  const condition = conditions[Math.floor(Math.random() * conditions.length)]

  const featureKeys = [
    "Brand",
    "Model",
    "Color",
    "Material",
    "Size",
    "Weight",
    "Year",
    "Dimensions",
    "Compatibility",
    "Features",
    "Warranty",
  ]

  const numFeatures = Math.floor(Math.random() * 6) + 3
  const selectedFeatures = [...featureKeys].sort(() => 0.5 - Math.random()).slice(0, numFeatures)

  const featureValues = [
    "Apple",
    "Samsung",
    "Model X",
    "Black",
    "White",
    "Silver",
    "Leather",
    "Plastic",
    "Metal",
    "Large",
    "Medium",
    "Small",
    "500g",
    "1kg",
    "2023",
    "2022",
    "10 x 5 x 2 inches",
    "iPhone compatible",
    "Android compatible",
    "Waterproof",
    "Bluetooth",
    "1 year manufacturer",
  ]

  const item_features: Record<string, string> = {}
  selectedFeatures.forEach((key) => {
    item_features[key] = featureValues[Math.floor(Math.random() * featureValues.length)]
  })

  return {
    product_link: productLink,
    images,
    watchers,
    condition,
    item_features,
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Expected an array of items" }, { status: 400 })
    }

    // In a real implementation, we would call the actual API:
    // const response = await fetch('https://project141b.onrender.com/product-data', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(body)
    // })
    // const data = await response.json()

    // For demonstration, generate mock data
    const productData = body.map((item) => {
      if (!item.product_link) {
        return { error: "Missing product_link", product_link: "" }
      }
      return generateMockProductData(item.product_link)
    })

    return NextResponse.json(productData)
  } catch (error) {
    console.error("Error in product-data API route:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}

