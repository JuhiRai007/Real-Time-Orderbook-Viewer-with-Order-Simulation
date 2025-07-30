import { useState, useEffect, useRef, useCallback } from 'react';
import { exchangeAPI } from '../services/api';
import { wsService } from '../services/websocket';

// Parsers for venue-specific WebSocket data normalization
const parsers = {
  okx: (data, timestamp) => {
    if (!data.arg || data.arg.channel !== 'books' || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
      return null;
    }
    const book = data.data[0];
    if (!book) return null;

    const parseEntry = (entry) => {
      if (!Array.isArray(entry) || entry.length < 2) return null;
      const price = parseFloat(entry[0]);
      const size = parseFloat(entry[1]);
      return isNaN(price) || isNaN(size) ? null : { price, size, orders: entry[3] ? parseInt(entry[3], 10) : 0, total: 0 };
    };

    return {
      bids: (book.bids || []).map(parseEntry).filter(Boolean).slice(0, 15),
      asks: (book.asks || []).map(parseEntry).filter(Boolean).slice(0, 15),
      timestamp: parseInt(book.ts) || timestamp,
      exchange: 'okx',
      symbol: data.arg.instId || '',
    };
  },

  bybit: (data, timestamp) => {
    if (!data.topic || !data.topic.includes('orderbook') || !data.data) return null;

    const book = data.data;
    const parseEntry = (entry) => {
      if (!Array.isArray(entry) || entry.length < 2) return null;
      const price = parseFloat(entry[0]);
      const size = parseFloat(entry[1]);
      return isNaN(price) || isNaN(size) ? null : { price, size, orders: 0, total: 0 };
    };

    return {
      bids: (book.b || book.bids || []).map(parseEntry).filter(Boolean).slice(0, 15),
      asks: (book.a || book.asks || []).map(parseEntry).filter(Boolean).slice(0, 15),
      timestamp: book.ts || timestamp,
      exchange: 'bybit',
      symbol: book.s || (data.topic.split && data.topic.split('.')[2]) || '',
    };
  },

  deribit: (data, timestamp) => {
    if (!data.method || data.method !== 'subscription' || !data.params || !data.params.data) return null;
    const book = data.params.data;

    const parseEntry = (entry) => {
      if (!Array.isArray(entry) || entry.length < 3) return null;
      const operation = entry[0];
      const price = parseFloat(entry[1]);
      const size = parseFloat(entry[2]);
      if (operation === 'delete' || size === 0) return null;
      return isNaN(price) || isNaN(size) ? null : { price, size, orders: 0, total: 0 };
    };

    return {
      bids: (book.bids || []).map(parseEntry).filter(Boolean).sort((a, b) => b.price - a.price).slice(0, 15),
      asks: (book.asks || []).map(parseEntry).filter(Boolean).sort((a, b) => a.price - b.price).slice(0, 15),
      timestamp: book.timestamp || timestamp,
      exchange: 'deribit',
      symbol: book.instrument_name || (data.params.channel && data.params.channel.split && data.params.channel.split('.')[1]) || '',
    };
  },
};

export const useOrderbook = (venue, symbol, options = {}) => {
  const {
    throttleMs = 500,           
    maxUpdatesPerSecond = 2,   
    enableThrottling = true,
  } = options;

  const [orderbook, setOrderbook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); 
  const [dataSource, setDataSource] = useState('none'); 
  const [updateCount, setUpdateCount] = useState(0);

  const fallbackIntervalRef = useRef(null);
  const statusCheckIntervalRef = useRef(null);
  const lastMessageTimeRef = useRef(0);
  const throttleTimeoutRef = useRef(null);
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
    }
  }, []);

  const startFallbackPolling = useCallback(() => {
    if (fallbackIntervalRef.current || !venue || !symbol) return;

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
        setConnectionStatus('error');
        setError(`Polling failed: ${err.message}`);
      }
    };

    fetchData();
    fallbackIntervalRef.current = setInterval(fetchData, 5000); 
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

      const data = await exchangeAPI.getOrderbook(venue, symbol);
      if (!data) throw new Error('No data received from API');

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
      setError(`Failed to load initial data: ${err.message}`);
      setLoading(false);
      setDataSource('none');
      setConnectionStatus('error');
    }
  }, [venue, symbol]);

  const throttledUpdate = useCallback(
    (parsedData) => {
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
        setOrderbook(pendingUpdateRef.current);
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
    },
    [throttleMs, enableThrottling]
  );

  const handleWebSocketMessage = useCallback(
    (data) => {
      try {
        lastMessageTimeRef.current = Date.now();

        const parser = parsers[venue.toLowerCase()];
        if (!parser) return;

        const parsed = parser(data, lastMessageTimeRef.current);
        if (!parsed) return;

        if (!parsed.bids || !parsed.asks) return;

        throttledUpdate(parsed);
        stopFallbackPolling();
      } catch (err) {
        setConnectionStatus('error');
        setError(`Data processing error: ${err.message}`);
      }
    },
    [venue, throttledUpdate, stopFallbackPolling]
  );

  const handleWebSocketError = useCallback(
    (err) => {
      setError(`Connection error: ${err.message}`);
      setConnectionStatus('error');
      startFallbackPolling();
    },
    [startFallbackPolling]
  );

  useEffect(() => {
    if (!venue || !symbol) return;

    const checkConnection = () => {
      const now = Date.now();
      const timeSinceLastMessage = now - lastMessageTimeRef.current;

      if (dataSource === 'websocket' && timeSinceLastMessage > 15000) {
        setConnectionStatus('error');
        setError('WebSocket connection stale, switching to polling');
        startFallbackPolling();
      }
    };

    statusCheckIntervalRef.current = setInterval(checkConnection, 5000);
    return () => {
      if (statusCheckIntervalRef.current) clearInterval(statusCheckIntervalRef.current);
    };
  }, [venue, symbol, dataSource, startFallbackPolling]);

  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) clearTimeout(throttleTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!venue || !symbol) {
      setError('Venue and symbol are required');
      setLoading(false);
      return;
    }

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
      wsService.connect(venue, symbol, handleWebSocketMessage, handleWebSocketError);
    } catch (err) {
      handleWebSocketError(err);
    }

    return () => {
      stopFallbackPolling();
      wsService.disconnect(`${venue}-${symbol}`);
      setConnectionStatus('disconnected');
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [
    venue,
    symbol,
    fetchInitialData,
    handleWebSocketMessage,
    handleWebSocketError,
    stopFallbackPolling,
  ]);

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
