"use client"

import { useState } from "react"

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [results, setResults] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const handleSearch = async () => {
    if (!searchTerm.trim()) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/auctions?search_term=${encodeURIComponent(searchTerm)}`)
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="p-4">
      <div className="flex gap-2 mb-4">
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Enter search term..."
          className="border p-2 flex-grow"
        />
        <button 
          onClick={handleSearch}
          disabled={isLoading} 
          className="bg-blue-500 text-white p-2 disabled:bg-gray-400"
        >
          {isLoading ? "Loading..." : "Search"}
        </button>
      </div>
      
      {results && (
        <div className="mt-4">
          <h2 className="text-xl font-bold mb-2">Results:</h2>
          <pre className="bg-gray-100 p-4 overflow-auto max-h-[70vh]">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
} 