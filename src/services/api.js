class ExchangeAPI {
  constructor() {
    this.baseUrls = {
      okx: '/api/okx',
      bybit: '/api/bybit',
      deribit: '/api/deribit'
    };

    this.wsUrls = {
      okx: 'wss://ws.okx.com:8443/ws/v5/public',
      bybit: 'wss://stream.bybit.com/v5/public/linear',
      deribit: 'wss://www.deribit.com/ws/api/v2'
    };

    this.requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    this.fallbackData = this.generateFallbackData();
  }

  generateFallbackData() {
    const generateOrderbookSide = (basePrice, isAsk = false, count = 15) => {
      const side = [];
      for (let i = 0; i < count; i++) {
        const priceOffset = isAsk ? i * 0.5 : -i * 0.5;
        const price = basePrice + priceOffset;
        const size = Math.random() * 10 + 1;
        side.push({
          price: parseFloat(price.toFixed(2)),
          size: parseFloat(size.toFixed(4)),
          orders: Math.floor(Math.random() * 20) + 1,
          total: 0
        });
      }
      return side;
    };

    return {
      orderbooks: {
        'BTC-USDT': {
          bids: generateOrderbookSide(45000, false),
          asks: generateOrderbookSide(45001, true),
          timestamp: Date.now(),
          venue: 'fallback'
        },
        'ETH-USDT': {
          bids: generateOrderbookSide(2500, false),
          asks: generateOrderbookSide(2501, true),
          timestamp: Date.now(),
          venue: 'fallback'
        },
        'BTCUSDT': {
          bids: generateOrderbookSide(45000, false),
          asks: generateOrderbookSide(45001, true),
          timestamp: Date.now(),
          venue: 'fallback'
        },
        'ETHUSDT': {
          bids: generateOrderbookSide(2500, false),
          asks: generateOrderbookSide(2501, true),
          timestamp: Date.now(),
          venue: 'fallback'
        }
      }
    };
  }

  async getOKXOrderbook(symbol) {
    try {
      const url = `${this.baseUrls.okx}/market/books?instId=${symbol}&sz=15`;
      console.log('OKX Request URL:', url);
      const response = await fetch(url, this.requestOptions);

      if (!response.ok) {
        throw new Error(`OKX API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('OKX Raw Response:', data);

      if (data.code !== '0' && data.code !== 0) {
        throw new Error(`OKX API error: ${data.msg || data.message || 'Unknown error'}`);
      }

      if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
        throw new Error('No orderbook data received from OKX');
      }

      return this.formatOKXOrderbook(data.data[0], symbol);
    } catch (error) {
      console.error('OKX API Error:', error);
      return this.getFallbackOrderbook(symbol, 'okx');
    }
  }

  formatOKXOrderbook(data, symbol) {
    console.log('Formatting OKX data:', data);

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid OKX orderbook data format');
    }

    const formatSide = (side) => {
      if (!Array.isArray(side)) return [];
      return side.slice(0, 15).map(entry => {
        if (!Array.isArray(entry) || entry.length < 2) return null;
        const price = parseFloat(entry[0]);
        const size = parseFloat(entry[1]);
        const orders = entry[3] ? parseInt(entry[3]) : 0;

        if (isNaN(price) || isNaN(size)) return null;

        return {
          price,
          size,
          orders,
          total: 0
        };
      }).filter(Boolean);
    };

    return {
      bids: formatSide(data.bids || []),
      asks: formatSide(data.asks || []),
      timestamp: parseInt(data.ts) || Date.now(),
      venue: 'okx',
      symbol
    };
  }

  async getBybitOrderbook(symbol) {
    try {
      const url = `${this.baseUrls.bybit}/v5/market/orderbook?category=linear&symbol=${symbol}&limit=25`;
      console.log('Bybit Request URL:', url);
      const response = await fetch(url, this.requestOptions);

      if (!response.ok) {
        throw new Error(`Bybit API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Bybit Raw Response:', data);

      if (data.retCode !== 0) {
        throw new Error(`Bybit API error: ${data.retMsg || data.retExtInfo || 'Unknown error'}`);
      }

      if (!data.result || typeof data.result !== 'object') {
        throw new Error('No orderbook data received from Bybit');
      }

      return this.formatBybitOrderbook(data.result, symbol);
    } catch (error) {
      console.error('Bybit API Error:', error);
      return this.getFallbackOrderbook(symbol, 'bybit');
    }
  }

  formatBybitOrderbook(data, symbol) {
    console.log('Formatting Bybit data:', data);

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid Bybit orderbook data format');
    }

    const formatSide = (side) => {
      if (!Array.isArray(side)) return [];
      return side.slice(0, 15).map(entry => {
        if (!Array.isArray(entry) || entry.length < 2) return null;
        const price = parseFloat(entry[0]);
        const size = parseFloat(entry[1]);

        if (isNaN(price) || isNaN(size)) return null;

        return {
          price,
          size,
          orders: 0, 
          total: 0
        };
      }).filter(Boolean);
    };

    return {
      bids: formatSide(data.b || data.bids || []),
      asks: formatSide(data.a || data.asks || []),
      timestamp: parseInt(data.ts) || Date.now(),
      venue: 'bybit',
      symbol
    };
  }

  async getDeribitOrderbook(symbol) {
    try {
      const url = `${this.baseUrls.deribit}/public/get_order_book?instrument_name=${symbol}&depth=15`;
      console.log('Deribit Request URL:', url);
      const response = await fetch(url, this.requestOptions);

      if (!response.ok) {
        throw new Error(`Deribit API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Deribit Raw Response:', data);

      if (data.error) {
        throw new Error(`Deribit API error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      if (!data.result || typeof data.result !== 'object') {
        throw new Error('No orderbook data received from Deribit');
      }

      return this.formatDeribitOrderbook(data.result, symbol);
    } catch (error) {
      console.error('Deribit API Error:', error);
      return this.getFallbackOrderbook(symbol, 'deribit');
    }
  }

  formatDeribitOrderbook(data, symbol) {
    console.log('Formatting Deribit data:', data);

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid Deribit orderbook data format');
    }

    const formatSide = (side) => {
      if (!Array.isArray(side)) return [];
      return side.slice(0, 15).map(entry => {
        if (!Array.isArray(entry) || entry.length < 2) return null;
        const price = parseFloat(entry[0]);
        const size = parseFloat(entry[1]);

        if (isNaN(price) || isNaN(size)) return null;

        return {
          price,
          size,
          orders: 0, 
          total: 0
        };
      }).filter(Boolean);
    };

    return {
      bids: formatSide(data.bids || []),
      asks: formatSide(data.asks || []),
      timestamp: data.timestamp || Date.now(),
      venue: 'deribit',
      symbol
    };
  }

  getFallbackOrderbook(symbol, venue) {
    console.log(`Using fallback data for ${venue} ${symbol}`);

    const fallbackKey = symbol || 'BTC-USDT';
    let fallbackOrderbook = this.fallbackData.orderbooks[fallbackKey];

    if (!fallbackOrderbook) {
      const basePrice = symbol.includes('BTC') ? 45000 :
        symbol.includes('ETH') ? 2500 : 1000;

      const generateSide = (basePrice, isAsk = false, count = 15) => {
        const side = [];
        for (let i = 0; i < count; i++) {
          const priceOffset = isAsk ? i * 0.5 : -i * 0.5;
          const price = basePrice + priceOffset;
          const size = Math.random() * 10 + 1;
          side.push({
            price: parseFloat(price.toFixed(2)),
            size: parseFloat(size.toFixed(4)),
            orders: Math.floor(Math.random() * 20) + 1,
            total: 0
          });
        }
        return side;
      };

      fallbackOrderbook = {
        bids: generateSide(basePrice, false),
        asks: generateSide(basePrice + 1, true),
        timestamp: Date.now(),
        venue: venue + '_fallback',
        symbol
      };
    }

    return { ...fallbackOrderbook, venue: venue + '_fallback', symbol };
  }

  async getOrderbook(venue, symbol) {
    if (!venue || !symbol) {
      throw new Error('Venue and symbol are required');
    }

    try {
      let orderbook;

      switch (venue.toLowerCase()) {
        case 'okx':
          orderbook = await this.getOKXOrderbook(symbol);
          break;
        case 'bybit':
          orderbook = await this.getBybitOrderbook(symbol);
          break;
        case 'deribit':
          orderbook = await this.getDeribitOrderbook(symbol);
          break;
        default:
          throw new Error(`Unsupported venue: ${venue}`);
      }

      // Calculate cumulative totals
      return this.calculateCumulativeTotals(orderbook);
    } catch (error) {
      console.error(`Error fetching orderbook from ${venue}:`, error);
      const fallbackOrderbook = this.getFallbackOrderbook(symbol, venue);
      return this.calculateCumulativeTotals(fallbackOrderbook);
    }
  }

  // Calculate cumulative totals for orderbook visualization
  calculateCumulativeTotals(orderbook) {
    if (!orderbook || !orderbook.bids || !orderbook.asks) {
      console.error('Invalid orderbook structure for cumulative calculation');
      return orderbook;
    }

    let bidTotal = 0;
    let askTotal = 0;

    // Calculate cumulative bids (from highest to lowest price)
    orderbook.bids.forEach((bid, index) => {
      if (bid && typeof bid.size === 'number') {
        bidTotal += bid.size;
        orderbook.bids[index].total = bidTotal;
      }
    });

    // Calculate cumulative asks (from lowest to highest price)
    orderbook.asks.forEach((ask, index) => {
      if (ask && typeof ask.size === 'number') {
        askTotal += ask.size;
        orderbook.asks[index].total = askTotal;
      }
    });

    return orderbook;
  }

  async getTicker(venue, symbol) {
    if (!venue || !symbol) {
      throw new Error('Venue and symbol are required');
    }

    try {
      let url;

      switch (venue.toLowerCase()) {
        case 'okx':
          url = `${this.baseUrls.okx}/market/ticker?instId=${symbol}`;
          break;
        case 'bybit':
          url = `${this.baseUrls.bybit}/v5/market/tickers?category=linear&symbol=${symbol}`;
          break;
        case 'deribit':
          url = `${this.baseUrls.deribit}/public/get_ticker?instrument_name=${symbol}`;
          break;
        default:
          throw new Error(`Unsupported venue: ${venue}`);
      }

      console.log(`${venue} Ticker Request URL:`, url);
      const response = await fetch(url, this.requestOptions);

      if (!response.ok) {
        throw new Error(`${venue} ticker API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`${venue} Ticker Raw Response:`, data);

      return this.formatTicker(venue, data, symbol);
    } catch (error) {
      console.error(`Error fetching ticker from ${venue}:`, error);
      return this.getFallbackTicker(symbol, venue);
    }
  }

  formatTicker(venue, data, symbol) {
    try {
      switch (venue.toLowerCase()) {
        case 'okx':
          if (data.code !== '0' && data.code !== 0) {
            throw new Error(`OKX ticker error: ${data.msg || 'Unknown error'}`);
          }
          if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
            throw new Error('No ticker data from OKX');
          }

          const okxTicker = data.data[0];
          return {
            symbol: okxTicker.instId || symbol,
            lastPrice: parseFloat(okxTicker.last) || 0,
            change24h: parseFloat(okxTicker.chg) || 0,
            changePercent24h: parseFloat(okxTicker.chgPct) || 0,
            volume24h: parseFloat(okxTicker.vol24h) || 0,
            high24h: parseFloat(okxTicker.high24h) || 0,
            low24h: parseFloat(okxTicker.low24h) || 0,
            venue: 'okx'
          };

        case 'bybit':
          if (data.retCode !== 0) {
            throw new Error(`Bybit ticker error: ${data.retMsg || 'Unknown error'}`);
          }
          if (!data.result || !data.result.list || data.result.list.length === 0) {
            throw new Error('No ticker data from Bybit');
          }

          const bybitTicker = data.result.list[0];
          return {
            symbol: bybitTicker.symbol || symbol,
            lastPrice: parseFloat(bybitTicker.lastPrice) || 0,
            change24h: parseFloat(bybitTicker.price24hPcnt) * parseFloat(bybitTicker.lastPrice) / 100 || 0,
            changePercent24h: parseFloat(bybitTicker.price24hPcnt) || 0,
            volume24h: parseFloat(bybitTicker.volume24h) || 0,
            high24h: parseFloat(bybitTicker.highPrice24h) || 0,
            low24h: parseFloat(bybitTicker.lowPrice24h) || 0,
            venue: 'bybit'
          };

        case 'deribit':
          if (data.error) {
            throw new Error(`Deribit ticker error: ${data.error.message || 'Unknown error'}`);
          }
          if (!data.result) {
            throw new Error('No ticker data from Deribit');
          }

          const deribitTicker = data.result;
          return {
            symbol: deribitTicker.instrument_name || symbol,
            lastPrice: deribitTicker.last_price || 0,
            change24h: deribitTicker.price_change || 0,
            changePercent24h: deribitTicker.last_price ?
              (deribitTicker.price_change / deribitTicker.last_price) * 100 : 0,
            volume24h: deribitTicker.volume || 0,
            high24h: deribitTicker.high || 0,
            low24h: deribitTicker.low || 0,
            venue: 'deribit'
          };

        default:
          throw new Error(`Unsupported venue for ticker: ${venue}`);
      }
    } catch (error) {
      console.error(`Error formatting ${venue} ticker:`, error);
      return this.getFallbackTicker(symbol, venue);
    }
  }

  getFallbackTicker(symbol, venue) {
    const basePrice = symbol.includes('BTC') ? 45000 :
      symbol.includes('ETH') ? 2500 : 1000;

    return {
      symbol: symbol,
      lastPrice: basePrice,
      change24h: basePrice * 0.01,
      changePercent24h: 1.0,
      volume24h: 1000000,
      high24h: basePrice * 1.02,
      low24h: basePrice * 0.98,
      venue: venue + '_fallback'
    };
  }

  async getTradingPairs(venue) {
    try {
      let url;

      switch (venue.toLowerCase()) {
        case 'okx':
          url = `${this.baseUrls.okx}/public/instruments?instType=SPOT`;
          break;
        case 'bybit':
          url = `${this.baseUrls.bybit}/v5/market/instruments-info?category=linear`;
          break;
        case 'deribit':
          url = `${this.baseUrls.deribit}/public/get_instruments`;
          break;
        default:
          throw new Error(`Unsupported venue: ${venue}`);
      }

      const response = await fetch(url, this.requestOptions);

      if (!response.ok) {
        throw new Error(`${venue} instruments API error: ${response.status}`);
      }

      const data = await response.json();
      return this.formatTradingPairs(venue, data);
    } catch (error) {
      console.error(`Error fetching trading pairs from ${venue}:`, error);
      return this.getDefaultTradingPairs(venue);
    }
  }

  formatTradingPairs(venue, data) {
    try {
      switch (venue.toLowerCase()) {
        case 'okx':
          if (data.code !== '0' && data.code !== 0) return [];
          return data.data?.slice(0, 20).map(pair => pair.instId) || [];
        case 'bybit':
          if (data.retCode !== 0) return [];
          return data.result?.list?.slice(0, 20).map(pair => pair.symbol) || [];
        case 'deribit':
          if (data.error) return [];
          return data.result?.slice(0, 20).map(pair => pair.instrument_name) || [];
        default:
          return [];
      }
    } catch (error) {
      console.error(`Error formatting ${venue} trading pairs:`, error);
      return this.getDefaultTradingPairs(venue);
    }
  }

  getDefaultTradingPairs(venue) {
    const defaultPairs = {
      okx: ['BTC-USDT', 'ETH-USDT', 'BTC-USD', 'ETH-USD', 'SOL-USDT', 'ADA-USDT'],
      bybit: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT'],
      deribit: ['BTC-PERPETUAL', 'ETH-PERPETUAL', 'SOL-PERPETUAL']
    };

    return defaultPairs[venue.toLowerCase()] || [];
  }

  // Health check for all venues
  async healthCheck() {
    const venues = ['okx', 'bybit', 'deribit'];
    const results = {};

    for (const venue of venues) {
      try {
        const defaultSymbol = this.getDefaultTradingPairs(venue)[0];
        const orderbook = await this.getOrderbook(venue, defaultSymbol);

        results[venue] = {
          status: orderbook.venue.includes('fallback') ? 'fallback' : 'healthy',
          lastCheck: Date.now(),
          symbol: defaultSymbol,
          fallbackActive: orderbook.venue.includes('fallback')
        };
      } catch (error) {
        results[venue] = {
          status: 'error',
          error: error.message,
          lastCheck: Date.now(),
          fallbackActive: true
        };
      }
    }

    return results;
  }
}

// Create and export singleton instance
export const exchangeAPI = new ExchangeAPI();

// Export class for testing or custom instances
export { ExchangeAPI };

// Export utility functions
export const isValidVenue = (venue) => {
  return ['okx', 'bybit', 'deribit'].includes(venue.toLowerCase());
};

// Fixed symbol formatting
export const formatSymbolForVenue = (symbol, venue) => {
  if (!symbol || !venue) return symbol;

  // Convert symbol format between venues if needed
  switch (venue.toLowerCase()) {
    case 'okx':
      // OKX uses BTC-USDT format
      if (!symbol.includes('-')) {
        return symbol.replace(/USDT$/, '-USDT').replace(/USD$/, '-USD');
      }
      return symbol;

    case 'bybit':
      // Bybit uses BTCUSDT format (no dashes)
      return symbol.replace(/-/g, '').toUpperCase();

    case 'deribit':
      // Deribit uses BTC-PERPETUAL format
      if (symbol.includes('USDT') || symbol.includes('USD')) {
        const base = symbol.replace(/[-]?USDT?$/, '').replace(/[-]?USD$/, '');
        return base + '-PERPETUAL';
      }
      if (!symbol.includes('PERPETUAL') && !symbol.includes('-')) {
        return symbol + '-PERPETUAL';
      }
      return symbol;

    default:
      return symbol;
  }
};