import { NextResponse } from "next/server"

interface AuctionItem {
  product_link: string
  [key: string]: string | undefined
}

interface ProductDataItem {
  product_link?: string
  images?: string[]
  watchers?: string
  condition?: string
  item_features?: Record<string, string>
  id?: string
}

export async function POST(request: Request) {
  console.log("[Product Data API] Received request")
  
  try {
    // Parse the auction items from the request body
    const auctionItems: AuctionItem[] = await request.json()
    
    if (!Array.isArray(auctionItems)) {
      console.log("[Product Data API] Error: Input is not an array")
      return NextResponse.json({ error: "Expected an array of auction items" }, { status: 400 })
    }
    
    console.log(`[Product Data API] Processing ${auctionItems.length} items`)
    
    // Create a simplified list with just the product_link property
    // This matches the Python server's AuctionItem model
    const simplifiedItems = auctionItems.map(item => ({
      product_link: item.product_link
    }));
    
    console.log(`[Product Data API] Calling external API with simplified format`)
    console.log(`[Product Data API] Sample request item:`, JSON.stringify(simplifiedItems[0], null, 2))
    
    const startTime = Date.now()
    
    try {
      const response = await fetch('https://project141b.onrender.com/product-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simplifiedItems)
      })
      
      const responseTime = Date.now() - startTime
      console.log(`[Product Data API] External API responded in ${responseTime}ms with status: ${response.status}`)
      
      // Try to get the response body even if it's an error
      const responseText = await response.text();
      
      if (!response.ok) {
        console.error(`[Product Data API] Error response from external API: ${responseText}`);
        return NextResponse.json({ 
          error: `External API responded with status: ${response.status}`,
          details: responseText
        }, { status: response.status })
      }
      
      // Parse the JSON response
      const rawData = JSON.parse(responseText);
      console.log(`[Product Data API] Successfully received data for ${rawData.length} products`)
      
      // Properly type the response data and ensure it has product_link
      const typedData: ProductDataItem[] = rawData.map((item: any) => {
        // If the item already has a product_link, use it
        if (item.product_link) {
          return item as ProductDataItem;
        }
        
        // Otherwise, try to find a matching item in the original request
        // First check if there's a URL or link property that might contain the product_link
        let productLink = item.url || item.link || item.product_url;
        
        // If that didn't work, try to extract from the product_link field if present, 
        // or find a matching link from the original items
        if (!productLink) {
          // If the item has some unique identifier, try to match with original items
          if (item.id || item.itemId || item.productId) {
            const identifier = item.id || item.itemId || item.productId;
            // This is just a fallback in case the API response doesn't include product_link
            // but does include the ID that could be used for lookup in our original list
            console.log(`[Product Data API] Item missing product_link, trying to match ID: ${identifier}`);
          }
          
          // If we couldn't find a match, just use the first unmatched item
          // This is not ideal but better than no link at all
          if (!productLink && simplifiedItems.length > 0) {
            productLink = simplifiedItems[0].product_link;
            console.log(`[Product Data API] Warning: Using fallback product_link for item:`, 
              JSON.stringify(item).substring(0, 100) + "...");
          }
        }
        
        return {
          ...item,
          product_link: productLink
        } as ProductDataItem;
      });
      
      // Log a warning if some items don't have product_link
      const missingLinkItems = typedData.filter(item => !item.product_link);
      if (missingLinkItems.length > 0) {
        console.warn(`[Product Data API] Warning: ${missingLinkItems.length} items still missing product_link`);
      }
      
      // Log the first item of the typed response
      if (typedData.length > 0) {
        console.log(`[Product Data API] Sample response item:`, JSON.stringify(typedData[0], null, 2))
      }
      
      return NextResponse.json(typedData)
    } catch (fetchError) {
      console.error(`[Product Data API] Fetch error:`, fetchError)
      return NextResponse.json({ 
        error: "Failed to fetch product data from external API",
        details: fetchError instanceof Error ? fetchError.message : String(fetchError)
      }, { status: 500 })
    }
  } catch (error) {
    console.error("[Product Data API] Error processing request:", error)
    return NextResponse.json({ 
      error: "Failed to process product data request",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

