"use client"

import type React from "react"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { Search, Info, Clock, Truck, Award, User, Loader2, X, Filter, PlusCircle } from "lucide-react"
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
  Legend,
} from "recharts"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from 'next/image'

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
  condition?: string
}

interface ProductData {
  product_link: string
  images?: string[]
  watchers?: string
  condition?: string
  item_features?: Record<string, string>
  error?: string
}

// Move these components outside the main component for better performance
const ProductFeatures = ({ productData }: { productData: ProductData }) => {
  if (!productData.item_features || Object.keys(productData.item_features).length === 0) {
    return null;
  }
  
  return (
    <div className="mb-4">
      <h4 className="font-medium mb-2">Product Specifications</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {Object.entries(productData.item_features).map(([key, value]) => (
          <div key={key} className="flex flex-col">
            <span className="text-sm text-muted-foreground">{key}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProductImages = ({ images }: { images?: string[] }) => {
  if (!images || images.length === 0) {
    return null;
  }
  
  return (
    <div className="mb-4">
      <h4 className="font-medium mb-2">Additional Images</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {images.map((img, i) => (
          <div key={i} className="aspect-square bg-muted rounded overflow-hidden">
            <Image
              src={img}
              alt={`Product image ${i + 1}`}
              className="w-full h-full object-cover"
              width={200}
              height={200}
              onError={(e) => {
                console.error(`Failed to load additional image: ${img}`);
                e.currentTarget.src = "https://via.placeholder.com/100?text=No+Image";
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// 3. Add proper TypeScript types for requestIdleCallback
declare global {
  interface Window {
    requestIdleCallback: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions
    ) => number;
    cancelIdleCallback: (handle: number) => void;
  }
}

// 4. Implement chunked processing for large datasets
/*
const processInChunks = (items: AuctionItem[], chunkSize: number, processChunk: (chunk: AuctionItem[]) => void, onComplete: () => void) => {
  let index = 0;
  
  function doChunk() {
    const chunk = items.slice(index, index + chunkSize);
    index += chunkSize;
    
    processChunk(chunk);
    
    if (index < items.length) {
      setTimeout(doChunk, 0);
    } else {
      onComplete();
    }
  }
  
  doChunk();
};
*/

export default function EbaySearch() {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<{
    auctions: AuctionItem[],
    productData: ProductData[]
  }>({
    auctions: [],
    productData: []
  })
  const [loading, setLoading] = useState(false)
  const [productLoading, setProductLoading] = useState(false)
  const [selectedAuction, setSelectedAuction] = useState<AuctionItem | null>(null)
  const [selectedProductData, setSelectedProductData] = useState<ProductData | null>(null)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [filters, setFilters] = useState({
    priceRange: [0, 1000] as [number, number],
    condition: "all",
    sortBy: "default"
  })
  const [customFilters, setCustomFilters] = useState<{
    field: string;
    operator: string;
    value: string;
  }[]>([])
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  
  // State for chart data
  const [priceHistogram, setPriceHistogram] = useState<Array<{range: string; count: number}>>([])
  const [bidCountChartData, setBidCountChartData] = useState<Array<{name: string; fullName: string; bids: number}>>([])
  const [priceVsBidsData, setPriceVsBidsData] = useState<Array<{title: string; price: number; bids: number}>>([])
  const [metrics, setMetrics] = useState({
    avgPrice: 0,
    medianPrice: 0,
    avgBids: 0,
    totalBids: 0,
    totalItems: 0,
  })
  
  const [productVisualizations, setProductVisualizations] = useState<{
    type: string;
    title: string;
    data: Array<{name: string; value: number}>;
  }>({
    type: "none",
    title: "",
    data: []
  })

  // 1. Add additional loading states
  const [chartLoading, setChartLoading] = useState(false);
  const [filteringLoading, setFilteringLoading] = useState(false);

  // 2. Use useRef for data that doesn't need to trigger re-renders
  const lastFilterSettings = useRef({
    filters: {
      priceRange: [0, 1000] as [number, number],
      condition: "all",
      sortBy: "default"
    },
    customFilters: [] as {
      field: string;
      operator: string;
      value: string;
    }[]
  });

  // 3. Debounce filter changes to prevent excessive re-renders
  const debouncedSetFilters = useCallback((newFilters: {
    priceRange: [number, number];
    condition: string;
    sortBy: string;
  }) => {
    setFilteringLoading(true);
    setFilters(newFilters);
    setTimeout(() => setFilteringLoading(false), 100);
  }, [setFilteringLoading, setFilters]);

  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const totalPages = Math.ceil(searchResults.auctions.length / itemsPerPage);
  const paginatedAuctions = searchResults.auctions.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Fix the rawAuctionData reference which is used but not defined
  const rawAuctionData = useRef<AuctionItem[]>([]);

  // Add hasSearched state for the warning card
  const [hasSearched, setHasSearched] = useState(false);

  // Fix the handleSearch function to include all dependencies and set hasSearched
  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    // Set hasSearched to true when search is performed
    setHasSearched(true);
    
    setLoading(true);
    setLoadingProgress(0);
    
    // Reset filters when performing a new search
    setFilters({
      priceRange: [0, 1000] as [number, number],
      condition: "all",
      sortBy: "default"
    });
    setCustomFilters([]);
    
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      // Use the auctions endpoint with the search term
      const response = await fetch(`/api/auctions?search_term=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();

      if (Array.isArray(data)) {
        // Store raw data in ref
        rawAuctionData.current = data;
        
        // Create mock product data immediately instead of making another API call
        const mockProductData = data.map(item => ({
          product_link: item.product_link,
          images: [],
          watchers: "0",
          condition: "Not available",
          item_features: {},
        }));
        
        // Update state once with both auction and product data
        setSearchResults({
          auctions: data,
          productData: mockProductData
        });

        clearInterval(progressInterval);
        setLoadingProgress(100);
        
        setTimeout(() => {
          setLoading(false);
          setLoadingProgress(0);
        }, 500);
      } else {
        console.error("Unexpected response format:", data);
      }
    } catch (error) {
      console.error("Auction search error:", error);
      clearInterval(progressInterval);
      setLoadingProgress(100);
      setTimeout(() => {
        setLoading(false);
        setLoadingProgress(0);
      }, 500);
    }
  }, [searchTerm, setLoading, setLoadingProgress, setFilters, setCustomFilters, setSearchResults, setHasSearched]);

  const prepareHistogramData = useCallback((data: number[], bins: number, prefix = "") => {
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
  }, [])

  const filteredAuctions = useMemo(() => {
    if (searchResults.auctions.length === 0) return []
    
    // Update last filter settings
    lastFilterSettings.current = {
      filters: { ...filters },
      customFilters: [...customFilters]
    };
    
    // Start filtering
    return searchResults.auctions.filter(auction => {
      const price = parseFloat(auction.price.replace(/[^0-9.]/g, ''))
      const bids = parseInt(auction.bid_count.match(/(\d+)/)?.[1] || "0")
      
      // Apply standard filters
      if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false
      if (filters.condition !== "all" && 
          (!auction.condition || !auction.condition.toLowerCase().includes(filters.condition.toLowerCase()))) {
        return false
      }
      
      // Apply custom filters
      for (const filter of customFilters) {
        let fieldValue = ""
        
        // Get the field value based on the filter field
        switch (filter.field) {
          case "title":
            fieldValue = auction.title
            break
          case "seller":
            fieldValue = auction.seller_name
            break
          case "price":
            fieldValue = price.toString()
            break
          case "bids":
            fieldValue = bids.toString()
            break
          default:
            fieldValue = auction[filter.field as keyof AuctionItem]?.toString() || ""
        }
        
        // Apply the operator
        switch (filter.operator) {
          case "contains":
            if (!fieldValue.toLowerCase().includes(filter.value.toLowerCase())) return false
            break
          case "equals":
            if (fieldValue.toLowerCase() !== filter.value.toLowerCase()) return false
            break
          case "greater":
            if (parseFloat(fieldValue) <= parseFloat(filter.value)) return false
            break
          case "less":
            if (parseFloat(fieldValue) >= parseFloat(filter.value)) return false
            break
        }
      }
      
      return true
    }).sort((a, b) => {
      // Apply sorting
      switch (filters.sortBy) {
        case "price-asc":
          return parseFloat(a.price.replace(/[^0-9.]/g, '')) - parseFloat(b.price.replace(/[^0-9.]/g, ''))
        case "price-desc":
          return parseFloat(b.price.replace(/[^0-9.]/g, '')) - parseFloat(a.price.replace(/[^0-9.]/g, ''))
        case "bids-desc":
          const bidsA = parseInt(a.bid_count.match(/(\d+)/)?.[1] || "0")
          const bidsB = parseInt(b.bid_count.match(/(\d+)/)?.[1] || "0")
          return bidsB - bidsA
        case "time-asc":
          return a.time_left.localeCompare(b.time_left)
        default:
          return 0
      }
    })
  }, [searchResults.auctions, filters, customFilters])

  const prepareChartData = useCallback(() => {
    // Extract prices (remove currency symbols and convert to numbers)
    const prices = filteredAuctions
      .map((item) => Number.parseFloat(item.price.replace(/[^0-9.-]+/g, "")))
      .filter((price) => !isNaN(price))

    // Extract bid counts
    const bidCounts = filteredAuctions
      .map((item) => {
        const match = item.bid_count.match(/(\d+)/)
        return match ? Number.parseInt(match[1]) : 0
      })
      .filter((count) => count > 0)

    // Create data for bid count chart
    const bidCountData = filteredAuctions
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

    // Create price vs bids data
    const priceVsBidsData = filteredAuctions
      .map((item) => {
        const price = Number.parseFloat(item.price.replace(/[^0-9.-]+/g, ""))
        const bids = Number.parseInt(item.bid_count.match(/(\d+)/)?.[1] || "0")

        if (!isNaN(price)) {
          return {
            title: item.title.slice(0, 30) + "...",
            price,
            bids,
          }
        }
        return null
      })
      .filter(
        (item): item is { title: string; price: number; bids: number } => item !== null,
      )

    // Create histograms
    const priceHistogram = prepareHistogramData(prices, 10, "$")

    // Calculate metrics
    const avgPrice = prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0
    const medianPrice = prices.length ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : 0
    const avgBids = bidCounts.length ? bidCounts.reduce((sum, count) => sum + count, 0) / bidCounts.length : 0
    const totalBids = bidCounts.reduce((sum, count) => sum + count, 0)

    return {
      priceHistogram,
      bidCountData,
      priceVsBidsData,
      metrics: {
        avgPrice,
        medianPrice,
        avgBids,
        totalBids,
        totalItems: filteredAuctions.length,
      },
    }
  }, [filteredAuctions, prepareHistogramData])

  // 6. Optimize chart data calculation with a worker-like approach
  const runOffMainThread = (callback: () => void) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      // Use requestIdleCallback if available (modern browsers)
      window.requestIdleCallback(() => callback());
    } else {
      // Fallback to setTimeout
      setTimeout(callback, 0);
    }
  };

  useEffect(() => {
    if (filteredAuctions.length > 0) {
      setChartLoading(true);
      
      // Run chart calculations off the main thread
      runOffMainThread(() => {
        const { priceHistogram: newPriceHistogram, bidCountData, priceVsBidsData: newPriceVsBidsData, metrics: newMetrics } = prepareChartData();
        
        setPriceHistogram(newPriceHistogram);
        setBidCountChartData(bidCountData);
        setPriceVsBidsData(newPriceVsBidsData);
        setMetrics(newMetrics);
        
        setChartLoading(false);
      });
    }
  }, [filteredAuctions, prepareChartData]);

  const generateProductVisualization = useCallback((productData: ProductData | null) => {
    if (!productData || !productData.item_features) {
      setProductVisualizations({ type: "none", title: "", data: [] })
      return
    }
    
    // Extract numeric features for visualization
    const numericFeatures: {name: string, value: number}[] = []
    
    Object.entries(productData.item_features).forEach(([key, value]) => {
      // Try to extract numeric values from features
      const numericMatch = value.match(/(\d+(\.\d+)?)/)
      if (numericMatch) {
        numericFeatures.push({
          name: key,
          value: parseFloat(numericMatch[0])
        })
      }
    })
    
    if (numericFeatures.length > 0) {
      setProductVisualizations({
        type: "features",
        title: "Product Specifications",
        data: numericFeatures
      })
    } else {
      setProductVisualizations({ type: "none", title: "", data: [] })
    }
  }, [])

  const handleAuctionSelect = async (auction: AuctionItem) => {
    setSelectedAuction(auction)
    
    // Instead of using pre-loaded product data, fetch it directly from single-product endpoint
    try {
      // Only fetch if we have a product link
      if (auction.product_link) {
        // Set loading state
        setProductLoading(true)
        setSelectedProductData(null) // Clear previous data
        setProductVisualizations({ type: "none", title: "", data: [] }) // Clear visualizations
        
        const response = await fetch(`/api/single-product?product_link=${encodeURIComponent(auction.product_link)}`)
        const data = await response.json()
        
        // Update the selected product data with the response
        setSelectedProductData(data)
        
        // Generate visualizations from the product data
        generateProductVisualization(data)
      }
    } catch (error) {
      console.error("Error fetching single product data:", error)
      // Set error state in product data
      setSelectedProductData({
        product_link: auction.product_link,
        error: "Failed to load product details"
      })
      setProductVisualizations({ type: "none", title: "", data: [] })
    } finally {
      setProductLoading(false)
    }
  }

  // Function to extract time remaining in a more readable format
  const formatTimeLeft = (timeLeft: string) => {
    return timeLeft.replace("left", "").trim()
  }

  const resetFilters = () => {
    setFilters({
      priceRange: [0, 1000] as [number, number],
      condition: "all",
      sortBy: "default"
    });
    setCustomFilters([]);
  };

  const calculateQuartiles = (values: number[]) => {
    if (values.length === 0) return { q1: 0, q3: 0, iqr: 0 };
    
    const sorted = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    
    return { q1, q3, iqr };
  };

  const removeOutliers = () => {
    // Extract prices and bids
    const prices = searchResults.auctions
      .map(item => parseFloat(item.price.replace(/[^0-9.]/g, '')))
      .filter(price => !isNaN(price));
      
    const bids = searchResults.auctions
      .map(item => parseInt(item.bid_count.match(/(\d+)/)?.[1] || "0"))
      .filter(bid => !isNaN(bid));
    
    // Calculate quartiles and IQR
    const priceStats = calculateQuartiles(prices);
    const bidStats = calculateQuartiles(bids);
    
    // Set lower and upper bounds (using 1.5 * IQR rule)
    const priceLowerBound = Math.max(0, priceStats.q1 - 1.5 * priceStats.iqr);
    const priceUpperBound = priceStats.q3 + 1.5 * priceStats.iqr;
    
    const bidLowerBound = Math.max(0, bidStats.q1 - 1.5 * bidStats.iqr);
    const bidUpperBound = bidStats.q3 + 1.5 * bidStats.iqr;
    
    // Update filters
    setFilters({
      ...filters,
      priceRange: [priceLowerBound, priceUpperBound] as [number, number],
    });
    
    // Add custom filters for bids instead
    const newCustomFilters = customFilters.filter(f => f.field !== "bids");
    
    // Add lower bound filter if needed
    if (bidLowerBound > 0) {
      newCustomFilters.push({ field: "bids", operator: "greater", value: bidLowerBound.toString() });
    }
    
    // Add upper bound filter if needed
    if (bidUpperBound < Math.max(...bids)) {
      newCustomFilters.push({ field: "bids", operator: "less", value: bidUpperBound.toString() });
    }
    
    setCustomFilters(newCustomFilters);
    
    // Show the filter panel if it's hidden
    if (!showFilterPanel) {
      setShowFilterPanel(true);
    }
  };

  const handleFilterChange = (newFilters: typeof filters | {
    field: string;
    operator: string;
    value: string;
  }[]) => {
    setFilteringLoading(true);
    
    // Check if we're updating filters or custom filters
    if (Array.isArray(newFilters)) {
      // Update custom filters
      setCustomFilters(newFilters);
    } else {
      // Update regular filters
      setFilters(newFilters);
    }
    
    // Reset to page 1 when filters change to show the first page of new results
    setPage(1);
    
    // Add a small delay to show loading state
    setTimeout(() => setFilteringLoading(false), 100);
  };

  return (
    <div className="container mx-auto py-8 px-4">
     
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>eBay Auction Search & Analysis</CardTitle>
          {!hasSearched && (
            <CardDescription className="text-red-500">
              Search for auctions on eBay and analyze market data for resellers (RUNNING ON THE FIRST TIME WILL TAKE A WHILE DUE TO SERVER SIDE STARTUP SUBSEQUENT RUNS WILL BE FASTER)
            </CardDescription>
          )}
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

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h3 className="text-lg font-medium">Searching for &quot;{searchTerm}&quot;</h3>
          <div className="w-full max-w-md">
            <Progress value={loadingProgress} className="h-2" />
          </div>
          <p className="text-sm text-muted-foreground">
            {loadingProgress < 100 ? "Fetching results..." : "Processing data..."}
          </p>
        </div>
      )}

      {searchResults.auctions.length > 0 && (
        <>
          <Card className="mb-8">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Filters & Analysis</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={removeOutliers}
                    disabled={searchResults.auctions.length === 0}
                  >
                    Remove Outliers
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={resetFilters}
                    disabled={customFilters.length === 0 && 
                      filters.priceRange[0] === 0 && 
                      filters.priceRange[1] === 1000 && 
                      filters.condition === "all" && 
                      filters.sortBy === "default"}
                  >
                    Reset Filters
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                  >
                    {showFilterPanel ? <X className="h-4 w-4 mr-2" /> : <Filter className="h-4 w-4 mr-2" />}
                    {showFilterPanel ? "Hide Filters" : "Show Filters"}
                  </Button>
                </div>
              </div>
              <CardDescription>
                Showing {filteredAuctions.length} of {searchResults.auctions.length} auctions
                {filteredAuctions.length < searchResults.auctions.length && (
                  <span className="ml-1 text-primary">
                    (filtered)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            
            {showFilterPanel && (
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="price-range">Price Range (${filters.priceRange[0]} - ${filters.priceRange[1]})</Label>
                        <Slider
                          id="price-range"
                          min={0}
                          max={2000}
                          step={10}
                          value={filters.priceRange}
                          onValueChange={(value) => debouncedSetFilters({...filters, priceRange: value as [number, number]})}
                          className="mt-2"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="sort-by">Sort Results</Label>
                        <Select 
                          value={filters.sortBy} 
                          onValueChange={(value) => handleFilterChange({...filters, sortBy: value})}
                        >
                          <SelectTrigger id="sort-by" className="mt-2">
                            <SelectValue placeholder="Sort by" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default</SelectItem>
                            <SelectItem value="price-asc">Price: Low to High</SelectItem>
                            <SelectItem value="price-desc">Price: High to Low</SelectItem>
                            <SelectItem value="bids-desc">Most Bids</SelectItem>
                            <SelectItem value="time-asc">Ending Soon</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="condition">Item Condition</Label>
                        <Select 
                          value={filters.condition} 
                          onValueChange={(value) => handleFilterChange({...filters, condition: value})}
                        >
                          <SelectTrigger id="condition" className="mt-2">
                            <SelectValue placeholder="Filter by condition" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Conditions</SelectItem>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="used">Used</SelectItem>
                            <SelectItem value="refurbished">Refurbished</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Custom Filters</h3>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCustomFilters([...customFilters, { field: "title", operator: "contains", value: "" }])}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Filter
                      </Button>
                    </div>
                    
                    {customFilters.map((filter, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-3">
                          <Select 
                            value={filter.field} 
                            onValueChange={(value) => {
                              const newFilters = [...customFilters];
                              newFilters[index].field = value;
                              handleFilterChange(newFilters);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Field" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="title">Title</SelectItem>
                              <SelectItem value="price">Price</SelectItem>
                              <SelectItem value="bids">Bids</SelectItem>
                              <SelectItem value="seller">Seller</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="col-span-3">
                          <Select 
                            value={filter.operator} 
                            onValueChange={(value) => {
                              const newFilters = [...customFilters];
                              newFilters[index].operator = value;
                              handleFilterChange(newFilters);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Operator" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="contains">Contains</SelectItem>
                              <SelectItem value="equals">Equals</SelectItem>
                              <SelectItem value="greater">Greater Than</SelectItem>
                              <SelectItem value="less">Less Than</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="col-span-5">
                          <Input 
                            value={filter.value} 
                            onChange={(e) => {
                              const newFilters = [...customFilters];
                              newFilters[index].value = e.target.value;
                              handleFilterChange(newFilters);
                            }}
                            placeholder="Value"
                          />
                        </div>
                        
                        <div className="col-span-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              const newFilters = [...customFilters];
                              newFilters.splice(index, 1);
                              handleFilterChange(newFilters);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Market Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-muted-foreground text-sm">Average Price</div>
                  <div className="text-2xl font-bold">${filteredAuctions.length ? metrics.avgPrice.toFixed(2) : "0.00"}</div>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-muted-foreground text-sm">Median Price</div>
                  <div className="text-2xl font-bold">${filteredAuctions.length ? metrics.medianPrice.toFixed(2) : "0.00"}</div>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-muted-foreground text-sm">Average Bids</div>
                  <div className="text-2xl font-bold">{filteredAuctions.length ? metrics.avgBids.toFixed(1) : "0.0"}</div>
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
              <TabsTrigger value="distributions">Price Distribution</TabsTrigger>
              <TabsTrigger value="correlation">Price vs. Bids Analysis</TabsTrigger>
              <TabsTrigger value="top-bids">Top Items by Bids</TabsTrigger>
            </TabsList>
            
            <TabsContent value="distributions">
              <Card>
                <CardHeader>
                  <CardTitle>Price Distribution</CardTitle>
                  <CardDescription>Histogram of prices across filtered auctions</CardDescription>
                </CardHeader>
                <CardContent>
                  {chartLoading ? (
                    <div className="flex flex-col items-center justify-center h-[300px]">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                      <p className="text-sm text-muted-foreground">Updating chart...</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={500} className="mt-4">
                      <BarChart 
                        data={priceHistogram}
                        margin={{ top: 20, right: 30, left: 20, bottom: 120 }}
                        className="w-full"
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="range" 
                          angle={-45} 
                          textAnchor="end" 
                          interval={0} 
                          height={120}
                          tick={{ fontSize: 12 }}
                          tickMargin={15}
                        />
                        <YAxis width={60} />
                        <RechartsTooltip />
                        <Bar dataKey="count" fill="#8884d8" name="Number of Items" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="correlation">
              <Card>
                <CardHeader>
                  <CardTitle>Price vs. Bids Analysis</CardTitle>
                  <CardDescription>Relationship between item prices and bidding activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid />
                      <XAxis 
                        type="number" 
                        dataKey="price" 
                        name="Price" 
                        unit="$" 
                        label={{ value: 'Price ($)', position: 'insideBottomRight', offset: -5 }}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="bids" 
                        name="Bids" 
                        label={{ value: 'Number of Bids', angle: -90, position: 'insideLeft' }}
                      />
                      <RechartsTooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-background border p-2 rounded shadow-sm">
                                <p className="font-medium">{payload[0].payload.title}</p>
                                <p>Price: ${payload[0].payload.price.toFixed(2)}</p>
                                <p>Bids: {payload[0].payload.bids}</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend />
                      <Scatter name="Auctions" data={priceVsBidsData} fill="#8884d8" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="top-bids">
              <Card>
                <CardHeader>
                  <CardTitle>Top Items by Bid Count</CardTitle>
                  <CardDescription>Items with the most bids indicate higher demand</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={500}>
                    <BarChart data={bidCountChartData}>
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
                          const index = filteredAuctions.findIndex(a => a.title.includes(data.name.replace('...', '')));
                          if (index !== -1) {
                            handleAuctionSelect(filteredAuctions[index]);
                          }
                        }} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle>Auction Results</CardTitle>
              <CardDescription>
                Found {searchResults.auctions.length} auctions for &quot;{searchTerm}&quot;
                {productLoading && " - Loading detailed product data..."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteringLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Filtering results...</p>
                </div>
              ) : (
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
                      {paginatedAuctions.map((auction, index) => {
                        return (
                          <TableRow
                            key={index}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleAuctionSelect(auction)}
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
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min((page - 1) * itemsPerPage + 1, filteredAuctions.length)} to {Math.min(page * itemsPerPage, filteredAuctions.length)} of {filteredAuctions.length} results
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>

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
                        <Image
                          src={selectedAuction.product_image}
                          alt={selectedAuction.title}
                          className="w-full h-full object-contain"
                          width={400}
                          height={400}
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

                        <ProductImages images={selectedProductData.images} />
                        
                        <ProductFeatures productData={selectedProductData} />

                        {productVisualizations.type !== "none" && (
                          <div className="mt-4">
                            <h4 className="font-medium mb-2">{productVisualizations.title}</h4>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={productVisualizations.data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={100} />
                                <YAxis />
                                <RechartsTooltip />
                                <Bar dataKey="value" fill="#82ca9d" />
                              </BarChart>
                            </ResponsiveContainer>
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

      {filteringLoading && (
        <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Filtering results...</p>
          </div>
        </div>
      )}
    </div>
  )
}

