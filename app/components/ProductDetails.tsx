"use client"

import { useEffect } from "react"

interface ProductData {
  images: string[]
  watchers: string
  condition: string
  item_features: Record<string, string>
  product_link: string
}

export default function ProductDetails({ productLink }: { productLink: string }) {
  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!productLink) {
        console.log("[ProductDetails] No product link provided")
        return
      }
      
      console.log(`[ProductDetails] Fetching details for product: ${productLink}`)
      
      try {
        const response = await fetch(`https://project141b.onrender.com/single-product?product_link=${encodeURIComponent(productLink)}`)
        
        console.log(`[ProductDetails] API response status: ${response.status}`)
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`)
        }
        
        const data = await response.json() as ProductData
        
        console.log("[ProductDetails] Successfully fetched product data")
        console.log("[ProductDetails] Image Links:", data.images)
        console.log("[ProductDetails] Number of images:", data.images.length)
        
        // Print each image URL individually for clarity
        data.images.forEach((url, index) => {
          console.log(`[ProductDetails] Image ${index + 1}: ${url}`)
        })
        
        console.log("[ProductDetails] Full product data:", data)
        
        return data.images
      } catch (err) {
        console.error("[ProductDetails] Failed to fetch product details:", err)
      }
    }

    fetchProductDetails()
  }, [productLink])

  // Just return null since we're only using this for data fetching and logging
  return null
} 