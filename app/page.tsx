"use client"

import type React from "react"

import { useState } from "react"
import { Search, Info, Clock, Truck, Award, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
} from "recharts"

interface AuctionItem {
  title: string
  price: string
  product_link: string
  bid_count: string
  time_left: string
  best_offer: string
  delivery_cost: string
  authenticity: string
  product_image: string
  seller_info: string
  seller_name: string
  seller_no_reviews: string
  seller_rating: string
}

interface ProductData {
  product_link: string
  images?: string[]
  watchers?: string
  condition?: string
  item_features?: Record<string, string>
  error?: string
}



export default function EbaySearch() {
  const [searchTerm, setSearchTerm] = useState("")
  const [auctions, setAuctions] = useState<AuctionItem[]>([])
  const [productData, setProductData] = useState<ProductData[]>([])
  const [loading, setLoading] = useState(false)
  const [productLoading, setProductLoading] = useState(false)
  const [selectedAuction, setSelectedAuction] = useState<AuctionItem | null>(null)
  const [selectedProductData, setSelectedProductData] = useState<ProductData | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchTerm.trim()) return
    setLoading(true)
    setAuctions([])
    setProductData([])

    try {
      // Use the auctions endpoint with the search term
      const response = await fetch(`/api/auctions?search_term=${encodeURIComponent(searchTerm)}`)
      const data = await response.json()

      if (Array.isArray(data)) {
        setAuctions(data)

        // Immediately fetch product data after receiving auction results
        if (data.length > 0) {
          fetchProductData(data)
        }
      } else {
        console.error("Unexpected response format:", data)
      }
    } catch (error) {
      console.error("Auction search error:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProductData = async (items: AuctionItem[]) => {
    setProductLoading(true)
    try {
      const response = await fetch("/api/product-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(items),
      })

      const data = await response.json()
      setProductData(data)
    } catch (error) {
      console.error("Error fetching product data:", error)
    } finally {
      setProductLoading(false)
    }
  }

  const prepareHistogramData = (data: number[], bins: number, prefix = "") => {
    if (data.length === 0) return []

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min
    const binWidth = range / bins

    const histogram = Array(bins).fill(0)
    data.forEach((value) => {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1)
      histogram[binIndex]++
    })

    return histogram.map((count, index) => ({
      range: `${prefix}${(min + index * binWidth).toFixed(2)} - ${prefix}${(min + (index + 1) * binWidth).toFixed(2)}`,
      count,
    }))
  }

  const prepareChartData = () => {
    // Extract prices (remove currency symbols and convert to numbers)
    const prices = auctions
      .map((item) => Number.parseFloat(item.price.replace(/[^0-9.-]+/g, "")))
      .filter((price) => !isNaN(price))

    // Extract ratings (convert percentage strings to numbers)
    const ratings = auctions
      .map((item) => Number.parseFloat(item.seller_rating.replace(/[^0-9.-]+/g, "")))
      .filter((rating) => !isNaN(rating))

    // Extract bid counts
    const bidCounts = auctions
      .map((item) => {
        const match = item.bid_count.match(/(\d+)/)
        return match ? Number.parseInt(match[1]) : 0
      })
      .filter((count) => count > 0)

    // Create data for bid count chart
    const bidCountData = auctions
      .map((item) => {
        const match = item.bid_count.match(/(\d+)/)
        const count = match ? Number.parseInt(match[1]) : 0
        if (count > 0) {
          return {
            name: item.title.slice(0, 30) + "...",
            fullName: item.title,
            bids: count,
          }
        }
        return null
      })
      .filter((item): item is { name: string; fullName: string; bids: number } => item !== null)
      .sort((a, b) => b.bids - a.bids)
      .slice(0, 10) // Top 10 items by bid count

    // Price to rating correlation data
    const priceRatingData = auctions
      .map((item) => {
        const price = Number.parseFloat(item.price.replace(/[^0-9.-]+/g, ""))
        const rating = Number.parseFloat(item.seller_rating.replace(/[^0-9.-]+/g, ""))
        const bids = Number.parseInt(item.bid_count.match(/(\d+)/)?.[1] || "0")

        if (!isNaN(price) && !isNaN(rating)) {
          return {
            title: item.title.slice(0, 20) + "...",
            price,
            rating,
            bids,
            z: bids || 1, // Size based on bids, minimum 1
          }
        }
        return null
      })
      .filter(
        (item): item is { title: string; price: number; rating: number; bids: number; z: number } => item !== null,
      )

    // Create histograms
    const priceHistogram = prepareHistogramData(prices, 10, "$")
    const ratingHistogram = prepareHistogramData(ratings, 10)

    // Calculate metrics
    const avgPrice = prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0
    const medianPrice = prices.length ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : 0
    const avgRating = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0
    const avgBids = bidCounts.length ? bidCounts.reduce((sum, count) => sum + count, 0) / bidCounts.length : 0
    const totalBids = bidCounts.reduce((sum, count) => sum + count, 0)

    return {
      priceHistogram,
      ratingHistogram,
      bidCountData,
      priceRatingData,
      metrics: {
        avgPrice,
        medianPrice,
        avgRating,
        avgBids,
        totalBids,
        totalItems: auctions.length,
      },
    }
  }

  const { priceHistogram, ratingHistogram, bidCountData, priceRatingData, metrics } = prepareChartData()

  const handleRowClick = (auction: AuctionItem) => {
    setSelectedAuction(auction)
    const productInfo = productData.find((p) => p.product_link === auction.product_link)
    setSelectedProductData(productInfo || null)
  }

  // Function to extract time remaining in a more readable format
  const formatTimeLeft = (timeLeft: string) => {
    return timeLeft.replace("left", "").trim()
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>eBay Auction Search & Analysis</CardTitle>
          <CardDescription>Search for auctions on eBay and analyze market data for resellers</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for auctions..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {auctions.length > 0 && (
        <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Market Overview</CardTitle>
              <CardDescription>Key metrics for "{searchTerm}" auctions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-muted-foreground text-sm">Average Price</div>
                  <div className="text-2xl font-bold">${metrics.avgPrice.toFixed(2)}</div>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-muted-foreground text-sm">Median Price</div>
                  <div className="text-2xl font-bold">${metrics.medianPrice.toFixed(2)}</div>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-muted-foreground text-sm">Average Rating</div>
                  <div className="text-2xl font-bold">{metrics.avgRating.toFixed(1)}%</div>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-muted-foreground text-sm">Average Bids</div>
                  <div className="text-2xl font-bold">{metrics.avgBids.toFixed(1)}</div>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-muted-foreground text-sm">Total Bids</div>
                  <div className="text-2xl font-bold">{metrics.totalBids}</div>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-muted-foreground text-sm">Total Items</div>
                  <div className="text-2xl font-bold">{metrics.totalItems}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="distributions" className="mb-8">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="distributions">Price & Rating Distributions</TabsTrigger>
              <TabsTrigger value="bids">Bid Analysis</TabsTrigger>
              <TabsTrigger value="correlation">Price-Rating Correlation</TabsTrigger>
            </TabsList>
            <TabsContent value="distributions">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Price Distribution</CardTitle>
                    <CardDescription>Histogram of prices across all auctions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={priceHistogram}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" angle={-45} textAnchor="end" interval={0} height={70} />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="count" fill="#8884d8" name="Number of Items" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Seller Rating Distribution</CardTitle>
                    <CardDescription>Histogram of seller ratings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={ratingHistogram}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" angle={-45} textAnchor="end" interval={0} height={70} />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="count" fill="#82ca9d" name="Number of Sellers" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="bids">
              <Card>
                <CardHeader>
                  <CardTitle>Top Items by Bid Count</CardTitle>
                  <CardDescription>Items with the most bids indicate higher demand</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={500}>
                    <BarChart data={bidCountData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        interval={0} 
                        height={100}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis />
                      <RechartsTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-background border p-2 rounded shadow-sm">
                                <p className="font-medium">{payload[0].payload.fullName || payload[0].payload.name}</p>
                                <p>Bids: {payload[0].payload.bids}</p>
                              </div>
                            )
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="bids" 
                        fill="#8884d8" 
                        name="Number of Bids"
                        onClick={(data) => {
                          const index = auctions.findIndex(a => a.title.includes(data.name.replace('...', '')));
                          if (index !== -1) {
                            const tableRows = document.querySelectorAll('table tbody tr');
                            if (tableRows[index]) {
                              tableRows[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
                              tableRows[index].classList.add('bg-accent');
                              setTimeout(() => tableRows[index].classList.remove('bg-accent'), 1500);
                            }
                          }
                        }} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="correlation">
              <Card>
                <CardHeader>
                  <CardTitle>Price vs. Seller Rating Correlation</CardTitle>
                  <CardDescription>Bubble size represents number of bids</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid />
                      <XAxis type="number" dataKey="price" name="Price" unit="$" />
                      <YAxis type="number" dataKey="rating" name="Rating" unit="%" />
                      <ZAxis type="number" dataKey="z" range={[50, 400]} name="Bids" />
                      <RechartsTooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-background border p-2 rounded shadow-sm">
                                <p className="font-medium">{payload[0].payload.title}</p>
                                <p>Price: ${payload[0].payload.price.toFixed(2)}</p>
                                <p>Rating: {payload[0].payload.rating.toFixed(1)}%</p>
                                <p>Bids: {payload[0].payload.bids}</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend />
                      <Scatter name="Auctions" data={priceRatingData} fill="#8884d8" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle>Auction Results</CardTitle>
              <CardDescription>
                Found {auctions.length} auctions for "{searchTerm}"
                {productLoading && " - Loading detailed product data..."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">Title</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="hidden md:table-cell">Bids</TableHead>
                      <TableHead className="hidden md:table-cell">Time Left</TableHead>
                      <TableHead className="hidden lg:table-cell">Seller</TableHead>
                      <TableHead className="hidden lg:table-cell">Rating</TableHead>
                      <TableHead className="w-[80px]">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auctions.map((auction, index) => {
                      return (
                        <TableRow
                          key={index}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleRowClick(auction)}
                        >
                          <TableCell className="font-medium">{auction.title}</TableCell>
                          <TableCell>{auction.price}</TableCell>
                          <TableCell className="hidden md:table-cell">{auction.bid_count}</TableCell>
                          <TableCell className="hidden md:table-cell">{formatTimeLeft(auction.time_left)}</TableCell>
                          <TableCell className="hidden lg:table-cell">{auction.seller_name}</TableCell>
                          <TableCell className="hidden lg:table-cell">{auction.seller_rating}</TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Info className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View auction details</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Dialog open={!!selectedAuction} onOpenChange={(open) => !open && setSelectedAuction(null)}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              {selectedAuction && (
                <>
                  <DialogHeader>
                    <DialogTitle>Auction Details</DialogTitle>
                    <DialogDescription>Detailed information about this auction</DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-6">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="aspect-square bg-muted rounded overflow-hidden">
                        <img
                          src={selectedAuction.product_image}
                          alt={selectedAuction.title}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            console.error(`Failed to load image: ${selectedAuction.product_image}`);
                            e.currentTarget.src = "https://via.placeholder.com/200?text=No+Image";
                          }}
                        />
                      </div>
                      <div className="md:col-span-2 grid gap-4">
                        <h2 className="text-xl font-bold">{selectedAuction.title}</h2>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="px-2 py-1">
                              {selectedAuction.price}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{formatTimeLeft(selectedAuction.time_left)}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-medium">Bids:</span>
                            <span>{selectedAuction.bid_count}</span>
                          </div>

                          {selectedAuction.delivery_cost && (
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-muted-foreground" />
                              <span>{selectedAuction.delivery_cost}</span>
                            </div>
                          )}

                          {selectedAuction.authenticity && (
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-muted-foreground" />
                              <span>{selectedAuction.authenticity}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedAuction.seller_name}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-medium">Rating:</span>
                            <span>
                              {selectedAuction.seller_rating} ({selectedAuction.seller_no_reviews} reviews)
                            </span>
                          </div>
                        </div>

                        <div className="mt-2">
                          <a
                            href={selectedAuction.product_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            View on eBay
                          </a>
                        </div>
                      </div>
                    </div>

                    {selectedProductData && (
                      <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold mb-4">Additional Product Information</h3>

                        {selectedProductData.condition && (
                          <div className="mb-4">
                            <h4 className="font-medium mb-1">Condition</h4>
                            <Badge variant="outline">{selectedProductData.condition}</Badge>
                          </div>
                        )}

                        {selectedProductData.watchers && (
                          <div className="mb-4">
                            <h4 className="font-medium mb-1">Watchers</h4>
                            <p>{selectedProductData.watchers}</p>
                          </div>
                        )}

                        {selectedProductData.images && selectedProductData.images.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-medium mb-2">Additional Images</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {selectedProductData.images.map((img, i) => (
                                <div key={i} className="aspect-square bg-muted rounded overflow-hidden">
                                  <img
                                    src={img}
                                    alt={`Product image ${i + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      console.error(`Failed to load additional image: ${img}`);
                                      e.currentTarget.src = "https://via.placeholder.com/100?text=No+Image";
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedProductData.item_features &&
                          Object.keys(selectedProductData.item_features).length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">Product Specifications</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {Object.entries(selectedProductData.item_features).map(([key, value]) => (
                                  <div key={key} className="flex flex-col">
                                    <span className="text-sm text-muted-foreground">{key}</span>
                                    <span>{value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        {selectedProductData.error && (
                          <div className="text-red-500">
                            Error loading additional product data: {selectedProductData.error}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

