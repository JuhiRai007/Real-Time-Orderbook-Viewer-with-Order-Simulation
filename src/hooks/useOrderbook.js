import { useState, useEffect, useRef, useCallback } from 'react';
import { exchangeAPI } from '../services/api';
import { wsService } from '../services/websocket';

const parsers = {
  okx: (data, timestamp) => {
    console.log('OKX WS Raw Data:', data);
    
    if (!data.arg || data.arg.channel !== 'books' || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
      console.log('OKX: Invalid data format');
      return null;
    }
    
    const book = data.data[0];
    if (!book) {
      console.log('OKX: No book data');
      return null;
    }
    
    const parseEntry = (entry) => {
      if (!Array.isArray(entry) || entry.length < 2) return null;
      const price = parseFloat(entry[0]);
      const size = parseFloat(entry[1]);
      return isNaN(price) || isNaN(size) ? null : { 
        price, 
        size, 
        orders: entry[3] ? parseInt(entry[3]) : 0,
        total: 0 
      };
    };

    const result = {
      bids: (book.bids || [])
        .map(parseEntry)
        .filter(Boolean)
        .slice(0, 15),
      asks: (book.asks || [])
        .map(parseEntry)
        .filter(Boolean)
        .slice(0, 15),
      timestamp: parseInt(book.ts) || timestamp,
      exchange: 'okx',
      symbol: data.arg.instId || '',
    };
    
    console.log('OKX Parsed:', { bids: result.bids.length, asks: result.asks.length });
    return result;
  },

  bybit: (data, timestamp) => {
    if (Math.random() < 0.1) { 
      console.log('Bybit WS Raw Data (sample):', data);
    }
    
    if (!data.topic || !data.topic.includes('orderbook') || !data.data) {
      return null;
    }
    
    const book = data.data;
    
    const parseBybitEntry = (entry) => {
      if (!Array.isArray(entry) || entry.length < 2) return null;
      const price = parseFloat(entry[0]);
      const size = parseFloat(entry[1]);
      return isNaN(price) || isNaN(size) ? null : { 
        price, 
        size, 
        orders: 0,
        total: 0 
      };
    };

    const result = {
      bids: (book.b || book.bids || [])
        .map(parseBybitEntry)
        .filter(Boolean)
        .slice(0, 15),
      asks: (book.a || book.asks || [])
        .map(parseBybitEntry)
        .filter(Boolean)
        .slice(0, 15),
      timestamp: book.ts || timestamp,
      exchange: 'bybit',
      symbol: book.s || data.topic.split('.')[2] || '',
    };
    
    if (Math.random() < 0.05) {
      console.log('Bybit Parsed (sample):', { bids: result.bids.length, asks: result.asks.length });
    }
    return result;
  },

  deribit: (data, timestamp) => {
    console.log('Deribit WS Raw Data:', data);
    
    if (!data.method || data.method !== 'subscription' || !data.params || !data.params.data) {
      console.log('Deribit: Invalid data format');
      return null;
    }
    
    const book = data.params.data;
    
    const parseEntry = (entry) => {
      if (!Array.isArray(entry) || entry.length < 3) return null;
      
      const operation = entry[0];
      const price = parseFloat(entry[1]);
      const size = parseFloat(entry[2]);
      
      if (operation === 'delete' || size === 0) return null;
      
      return isNaN(price) || isNaN(size) ? null : { 
        price, 
        size, 
        orders: 0,
        total: 0 
      };
    };

    const result = {
      bids: (book.bids || [])
        .map(parseEntry)
        .filter(Boolean)
        .sort((a, b) => b.price - a.price)
        .slice(0, 15),
      asks: (book.asks || [])
        .map(parseEntry)
        .filter(Boolean)
        .sort((a, b) => a.price - b.price)
        .slice(0, 15),
      timestamp: book.timestamp || timestamp,
      exchange: 'deribit',
      symbol: book.instrument_name || data.params.channel?.split('.')[1] || '',
    };
    
    console.log('Deribit Parsed:', { bids: result.bids.length, asks: result.asks.length });
    return result;
  },
};

export const useOrderbook = (venue, symbol, options = {}) => {
  const {
    throttleMs = venue?.toLowerCase() === 'bybit' ? 100 : 50, 
    maxUpdatesPerSecond = venue?.toLowerCase() === 'bybit' ? 10 : 20,
    enableThrottling = true
  } = options;

  const [orderbook, setOrderbook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [dataSource, setDataSource] = useState('none');
  const [updateCount, setUpdateCount] = useState(0);

  const fallbackIntervalRef = useRef();
  const statusCheckIntervalRef = useRef();
  const lastMessageTimeRef = useRef(0);
  const throttleTimeoutRef = useRef();
  const lastUpdateTimeRef = useRef(0);
  const updateCounterRef = useRef(0);
  const pendingUpdateRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateCount(updateCounterRef.current);
      updateCounterRef.current = 0;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const stopFallbackPolling = useCallback(() => {
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
      console.log('Stopped fallback polling');
    }
  }, []);

  const startFallbackPolling = useCallback(() => {
    if (fallbackIntervalRef.current || !venue || !symbol) return;

    console.log(`Starting fallback polling for ${venue} ${symbol}`);
    setDataSource('polling');
    setConnectionStatus('connecting');

    const fetchData = async () => {
      try {
        const data = await exchangeAPI.getOrderbook(venue, symbol);
        if (data) {
          setOrderbook({
            ...data,
            exchange: venue.toLowerCase(),
            symbol,
            timestamp: Date.now(),
          });
          setConnectionStatus('connected');
          setError(null);
        }
      } catch (err) {
        console.error('Polling error:', err);
        setConnectionStatus('error');
        setError(`Polling failed: ${err.message}`);
      }
    };

    fetchData();
    fallbackIntervalRef.current = setInterval(fetchData, 3000);
  }, [venue, symbol]);

  const fetchInitialData = useCallback(async () => {
    if (!venue || !symbol) {
      setError('Venue and symbol are required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('connecting');

      console.log(`Fetching initial ${venue} orderbook for ${symbol}`);
      const data = await exchangeAPI.getOrderbook(venue, symbol);
      
      if (!data) {
        throw new Error('No data received from API');
      }

      setOrderbook({
        ...data,
        exchange: venue.toLowerCase(),
        symbol,
        timestamp: Date.now(),
      });
      setDataSource(data.venue?.includes('fallback') ? 'fallback' : 'polling');
      setConnectionStatus('connected');
      setLoading(false);
    } catch (err) {
      console.error('Initial fetch error:', err);
      setError(`Failed to load initial data: ${err.message}`);
      setLoading(false);
      setDataSource('none');
      setConnectionStatus('error');
    }
  }, [venue, symbol]);

  const throttledUpdate = useCallback((parsedData) => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    
    if (!enableThrottling) {
      setOrderbook(parsedData);
      setDataSource('websocket');
      setConnectionStatus('connected');
      setLoading(false);
      setError(null);
      lastUpdateTimeRef.current = now;
      updateCounterRef.current++;
      return;
    }

    pendingUpdateRef.current = parsedData;

    if (timeSinceLastUpdate >= throttleMs) {
      setOrderbook(parsedData);
      setDataSource('websocket');
      setConnectionStatus('connected');
      setLoading(false);
      setError(null);
      lastUpdateTimeRef.current = now;
      updateCounterRef.current++;
      pendingUpdateRef.current = null;
    } else if (!throttleTimeoutRef.current) {
      throttleTimeoutRef.current = setTimeout(() => {
        if (pendingUpdateRef.current) {
          setOrderbook(pendingUpdateRef.current);
          setDataSource('websocket');
          setConnectionStatus('connected');
          setLoading(false);
          setError(null);
          lastUpdateTimeRef.current = Date.now();
          updateCounterRef.current++;
          pendingUpdateRef.current = null;
        }
        throttleTimeoutRef.current = null;
      }, throttleMs - timeSinceLastUpdate);
    }
  }, [throttleMs, enableThrottling]);

  const handleWebSocketMessage = useCallback((data) => {
    try {
      lastMessageTimeRef.current = Date.now();
      
      const parser = parsers[venue.toLowerCase()];
      if (!parser) {
        console.error(`No parser available for venue: ${venue}`);
        return;
      }

      const parsed = parser(data, lastMessageTimeRef.current);
      if (!parsed) {
        return;
      }

      if (!parsed.bids || !parsed.asks) {
        console.error('Invalid parsed data structure:', parsed);
        return;
      }

      throttledUpdate(parsed);
      stopFallbackPolling();
    } catch (err) {
      console.error('WS message processing error:', err);
      setConnectionStatus('error');
      setError(`Data processing error: ${err.message}`);
    }
  }, [venue, throttledUpdate, stopFallbackPolling]);

  // WebSocket error handler
  const handleWebSocketError = useCallback((err) => {
    console.warn('WebSocket error:', err);
    setError(`Connection error: ${err.message}`);
    setConnectionStatus('error');
    startFallbackPolling();
  }, [startFallbackPolling]);

  useEffect(() => {
    if (!venue || !symbol) return;

    const checkConnection = () => {
      const now = Date.now();
      const timeSinceLastMessage = now - lastMessageTimeRef.current;

      if (dataSource === 'websocket' && timeSinceLastMessage > 15000) {
        console.warn(`No WS messages for ${timeSinceLastMessage}ms, switching to polling`);
        setConnectionStatus('error');
        setError('WebSocket connection stale, using polling');
        startFallbackPolling();
      }
    };

    statusCheckIntervalRef.current = setInterval(checkConnection, 5000);
    return () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
    };
  }, [venue, symbol, dataSource, startFallbackPolling]);

  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!venue || !symbol) {
      setError('Venue and symbol are required');
      setLoading(false);
      return;
    }

    console.log(`Initializing orderbook for ${venue} ${symbol}`);

    setOrderbook(null);
    setLoading(true);
    setError(null);
    setConnectionStatus('connecting');
    setDataSource('none');
    setUpdateCount(0);
    lastMessageTimeRef.current = 0;
    updateCounterRef.current = 0;

    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
      throttleTimeoutRef.current = null;
    }
    pendingUpdateRef.current = null;

    fetchInitialData();

    try {
      wsService.connect(
        venue,
        symbol,
        handleWebSocketMessage,
        handleWebSocketError
      );
    } catch (err) {
      console.error('WebSocket connection failed:', err);
      handleWebSocketError(err);
    }

    return () => {
      console.log(`Cleaning up orderbook for ${venue} ${symbol}`);
      stopFallbackPolling();
      wsService.disconnect(`${venue}-${symbol}`);
      setConnectionStatus('disconnected');
      
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [venue, symbol, fetchInitialData, handleWebSocketMessage, handleWebSocketError, stopFallbackPolling]);

  return {
    orderbook,
    loading,
    error,
    connectionStatus,
    dataSource,
    updateCount, 
    refetch: fetchInitialData,
  };
};