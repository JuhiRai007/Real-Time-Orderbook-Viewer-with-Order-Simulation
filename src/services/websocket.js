export class WebSocketService {
  constructor() {
    this.connections = new Map();
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.connectionTimeout = 10000; 
  }

  connect(venue, symbol, onMessage, onError) {
    const key = `${venue}-${symbol}`;
    
    // Clean up existing connection
    if (this.connections.has(key)) {
      this.disconnect(key);
    }

    const wsUrl = this.getWebSocketUrl(venue);
    console.log(`Attempting to connect to ${venue} WebSocket:`, wsUrl);
    
    try {
      const ws = new WebSocket(wsUrl);
      
      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.warn(`${venue} WebSocket connection timeout`);
          ws.close();
          if (onError) onError(new Error(`${venue} WebSocket connection timeout`));
        }
      }, this.connectionTimeout);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log(`Connected to ${venue} WebSocket successfully`);
        this.reconnectAttempts.set(key, 0);
        
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            const subscribeMsg = this.getSubscriptionMessage(venue, symbol);
            console.log(`Subscribing to ${venue} orderbook for ${symbol}:`, subscribeMsg);
            ws.send(JSON.stringify(subscribeMsg));
            
            if (venue.toLowerCase() === 'bybit') {
              setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                  const altSubscribeMsg = {
                    op: 'subscribe',
                    args: [`orderbook.50.${symbol}`] 
                  };
                  console.log(`Trying alternative Bybit subscription:`, altSubscribeMsg);
                  ws.send(JSON.stringify(altSubscribeMsg));
                }
              }, 1000);
            }
          }
        }, 500);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.success === false && data.ret_msg) {
            console.error(`${venue} subscription error:`, data.ret_msg);
            if (onError) onError(new Error(`${venue} subscription failed: ${data.ret_msg}`));
            return;
          }
          
          if (this.isDataMessage(venue, data)) {
            console.log(` Received ${venue} orderbook data for ${symbol}`);
            onMessage(data);
          } else {
            console.log(` Received ${venue} system message:`, data);
          }
        } catch (error) {
          console.error(`Error parsing ${venue} WebSocket message:`, error);
          console.error('Raw message:', event.data);
        }
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log(` ${venue} WebSocket closed:`, {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        
        if (!event.wasClean || event.code !== 1000) {
          this.handleReconnect(venue, symbol, onMessage, onError);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error(`🚨 ${venue} WebSocket error:`, {
          readyState: ws.readyState,
          url: ws.url,
          error: error
        });
        
        const errorMessage = this.getWebSocketErrorMessage(ws.readyState, venue);
        if (onError) onError(new Error(errorMessage));
      };

      this.connections.set(key, ws);
      return ws;
      
    } catch (error) {
      console.error(`Failed to create ${venue} WebSocket:`, error);
      if (onError) onError(error);
      return null;
    }
  }

  isDataMessage(venue, data) {
    switch (venue.toLowerCase()) {
      case 'okx':
        return data.arg && data.arg.channel === 'books' && data.data && Array.isArray(data.data);
      
      case 'bybit':
        if (data.success === false) {
          console.error('Bybit subscription error:', data.ret_msg);
          return false;
        }
        return data.topic && data.topic.includes('orderbook') && 
               (data.type === 'snapshot' || data.type === 'delta') && 
               data.data;
      
      case 'deribit':
        return data.method === 'subscription' && 
               data.params && 
               data.params.channel && 
               data.params.channel.includes('book') &&
               data.params.data;
      
      default:
        return false;
    }
  }

  getWebSocketErrorMessage(readyState, venue) {
    switch (readyState) {
      case WebSocket.CONNECTING:
        return `${venue} WebSocket connection timeout - server may be unreachable`;
      case WebSocket.CLOSING:
        return `${venue} WebSocket is closing`;
      case WebSocket.CLOSED:
        return `${venue} WebSocket connection failed - check network connectivity`;
      default:
        return `${venue} WebSocket encountered an unknown error`;
    }
  }

  getWebSocketUrl(venue) {
    const urls = {
      okx: 'wss://ws.okx.com:8443/ws/v5/public',
      bybit: 'wss://stream.bybit.com/v5/public/linear',
      deribit: 'wss://www.deribit.com/ws/api/v2'
    };
    return urls[venue.toLowerCase()];
  }

  getSubscriptionMessage(venue, symbol) {
    const messages = {
      okx: {
        op: 'subscribe',
        args: [{
          channel: 'books',
          instId: symbol
        }]
      },
      bybit: {
        op: 'subscribe',
        args: [`orderbook.1.${symbol}`] 
      },
      deribit: {
        jsonrpc: '2.0',
        method: 'public/subscribe',
        params: {
          channels: [`book.${symbol}.100ms`]
        },
        id: Date.now()
      }
    };
    
    return messages[venue.toLowerCase()] || {};
  }

  handleReconnect(venue, symbol, onMessage, onError) {
    const key = `${venue}-${symbol}`;
    const attempts = this.reconnectAttempts.get(key) || 0;
    
    if (attempts < this.maxReconnectAttempts) {
      this.reconnectAttempts.set(key, attempts + 1);
      
      const delay = this.reconnectDelay * Math.pow(1.5, attempts); 
      console.log(`Attempting to reconnect to ${venue} in ${delay}ms (attempt ${attempts + 1}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(venue, symbol, onMessage, onError);
      }, delay);
    } else {
      console.error(` Max reconnection attempts reached for ${venue}`);
      if (onError) {
        onError(new Error(`Failed to connect to ${venue} after ${this.maxReconnectAttempts} attempts. Using fallback polling.`));
      }
    }
  }

  disconnect(key) {
    const ws = this.connections.get(key);
    if (ws) {
      ws.close(1000, 'Manual disconnect'); 
      this.connections.delete(key);
      this.reconnectAttempts.delete(key);
    }
  }

  disconnectAll() {
    for (const [key] of this.connections) {
      this.disconnect(key);
    }
  }

  // Get connection status
  getConnectionStatus(venue, symbol) {
    const key = `${venue}-${symbol}`;
    const ws = this.connections.get(key);
    
    if (!ws) return 'disconnected';
    
    switch (ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }
}

export const wsService = new WebSocketService();