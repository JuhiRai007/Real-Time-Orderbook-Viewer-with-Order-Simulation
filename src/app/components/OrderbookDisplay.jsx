import React, { useMemo } from 'react';

// Only needed for legacy/edge case, but kept for clarity
const calculateCumulativeTotals = (orders) => {
  let cumulative = 0;
  return orders.map(order => {
    cumulative += order.size;
    return { ...order, total: cumulative };
  });
};

export const OrderbookDisplay = ({
  orderbook,
  loading,
  simulatedOrder,
  exchange = 'unknown',
}) => {
  // Works for already-normalized orderbook: { asks: [], bids: [] }
  const normalizedOrderbook = useMemo(() => {
    if (
      orderbook &&
      Array.isArray(orderbook.asks) &&
      Array.isArray(orderbook.bids)
    ) {
      return {
        asks: calculateCumulativeTotals(orderbook.asks),
        bids: calculateCumulativeTotals(orderbook.bids),
      };
    }
    // fallback (legacy/raw API shape) can go here if needed
    return null;
  }, [orderbook]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!normalizedOrderbook) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No orderbook data available
      </div>
    );
  }

  const formatPrice = (price) => isNaN(price) ? '0.00' : price.toFixed(2);
  const formatSize = (size) => isNaN(size) ? '0.0000' : size.toFixed(4);

  const isSimulatedOrderLevel = (price, side) => (
    simulatedOrder &&
    simulatedOrder.side === side &&
    typeof simulatedOrder.price === 'number' &&
    Math.abs(simulatedOrder.price - price) < 0.01
  );

  const bestAsk = normalizedOrderbook.asks[0];
  const bestBid = normalizedOrderbook.bids[0];

  // Imbalance calc with safe guards
  const totalBidVolume = Array.isArray(normalizedOrderbook.bids)
    ? normalizedOrderbook.bids.reduce((sum, b) => sum + (b?.size || 0), 0)
    : 0;
  const totalAskVolume = Array.isArray(normalizedOrderbook.asks)
    ? normalizedOrderbook.asks.reduce((sum, a) => sum + (a?.size || 0), 0)
    : 0;
  const imbalance = totalBidVolume - totalAskVolume;
  const imbalanceRatio =
    totalBidVolume + totalAskVolume > 0
      ? ((totalBidVolume / (totalBidVolume + totalAskVolume)) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 w-full overflow-x-auto">
      {/* For quick data reassurance/debug only: */}
      {/* <pre className="text-xs text-gray-400 bg-gray-100 rounded p-2 mt-2 mb-4 overflow-auto max-h-32">
        {JSON.stringify(orderbook, null, 2)}
      </pre> */}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[700px] overflow-y-auto">
        {/* Asks */}
        <div>
          <h3 className="text-lg font-semibold text-red-600 mb-2">Asks (Sell Orders)</h3>
          <div className="space-y-1">
            <div className="grid grid-cols-3 gap-2 text-xs font-medium text-gray-500 mb-2">
              <span>Price</span>
              <span>Size</span>
              <span>Total</span>
            </div>
            {normalizedOrderbook.asks.slice().reverse().map((ask, index) => (
              <div
                key={`ask-${index}`}
                className={`grid grid-cols-3 gap-2 text-sm py-1 rounded ${
                  isSimulatedOrderLevel(ask.price, 'sell')
                    ? 'bg-yellow-100 border-2 border-yellow-400'
                    : 'hover:bg-red-50'
                }`}
              >
                <span className="text-red-600 font-mono">{formatPrice(ask.price)}</span>
                <span className="font-mono">{formatSize(ask.size)}</span>
                <span className="font-mono text-gray-600">{formatSize(ask.total)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bids */}
        <div>
          <h3 className="text-lg font-semibold text-green-600 mb-2">Bids (Buy Orders)</h3>
          <div className="space-y-1">
            <div className="grid grid-cols-3 gap-2 text-xs font-medium text-gray-500 mb-2">
              <span>Price</span>
              <span>Size</span>
              <span>Total</span>
            </div>
            {normalizedOrderbook.bids.map((bid, index) => (
              <div
                key={`bid-${index}`}
                className={`grid grid-cols-3 gap-2 text-sm py-1 rounded ${
                  isSimulatedOrderLevel(bid.price, 'buy')
                    ? 'bg-yellow-100 border-2 border-yellow-400'
                    : 'hover:bg-green-50'
                }`}
              >
                <span className="text-green-600 font-mono">{formatPrice(bid.price)}</span>
                <span className="font-mono">{formatSize(bid.size)}</span>
                <span className="font-mono text-gray-600">{formatSize(bid.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Spread */}
      {bestAsk && bestBid && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-center">
          <span className="text-sm text-gray-600">
            Spread: {formatPrice(bestAsk.price - bestBid.price)} ({(((bestAsk.price - bestBid.price) / bestBid.price) * 100).toFixed(3)}%)
          </span>
        </div>
      )}

      {/* Order Book Imbalance */}
      <div className="mt-2 mb-4 p-2 bg-blue-50 rounded text-center">
        <span className="text-sm text-blue-700 font-medium">
          Order Book Imbalance:
          <span
            className={
              imbalance > 0
                ? 'text-green-600 font-bold ml-2'
                : imbalance < 0
                  ? 'text-red-600 font-bold ml-2'
                  : 'text-gray-700 ml-2'
            }
          >
            {imbalance > 0 ? 'Buy Pressure' : imbalance < 0 ? 'Sell Pressure' : 'Balanced'}
          </span>
          <span className="ml-4 text-xs text-gray-500">({imbalanceRatio}% bids)</span>
        </span>
      </div>
    </div>
  );
};
