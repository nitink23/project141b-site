interface TfIdfResult {
  term: string;
  tfIdf: number;
  averagePrice: number;
  frequency: number;
}

export function calculateTfIdf(auctions: Array<{
  title: string;
  price: string;
}>): TfIdfResult[] {
  // Preprocess titles to remove common words and special characters
  const stopWords = new Set(['the', 'and', 'or', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'of', 'with', 'by']);
  
  // Process all titles
  const processedTitles = auctions.map((auction: {title: string}) => {
    return auction.title.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .filter((word: string) => !stopWords.has(word) && word.length > 2);
  });

  // Calculate term frequency for each word
  const termFreq: Map<string, number> = new Map();
  const termPrices: Map<string, number[]> = new Map();
  
  processedTitles.forEach((words, idx) => {
    // Explicitly type the Set to contain strings
    const uniqueWords = new Set<string>(words);
    uniqueWords.forEach((word: string) => {
      termFreq.set(word, (termFreq.get(word) || 0) + 1);
      const prices = termPrices.get(word) || [];
      prices.push(parseFloat(auctions[idx].price.replace(/[^0-9.]/g, '')));
      termPrices.set(word, prices);
    });
  });

  // Calculate IDF and price impact
  const numDocs = auctions.length;
  const results: TfIdfResult[] = [];

  termFreq.forEach((freq, term) => {
    const idf = Math.log(numDocs / freq);
    const tfIdf = freq * idf;
    
    const prices = termPrices.get(term) || [];
    const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    results.push({
      term,
      tfIdf,
      averagePrice,
      frequency: freq
    });
  });

  // Sort by TF-IDF score and price impact
  return results
    .filter(result => result.frequency >= 3) // Only terms that appear at least 3 times
    .sort((a, b) => b.tfIdf * b.averagePrice - a.tfIdf * a.averagePrice)
    .slice(0, 10); // Top 10 most significant terms
} 