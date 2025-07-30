import React from 'react';

export const OrderVisualization = ({ order, orderImpact, orderbook }) => {
  if (!order || !orderImpact) {
    return null;
  }
  const formatTime = (seconds) => {
    if (seconds < 0) return 'Unknown';
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };
  const getImpactColor = (impact) => {
    if (impact < 0.1) return 'text-green-600';
    if (impact < 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 w-full">
      <h2 className="text-xl font-semibold mb-4">Order Impact Analysis</h2>
     
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Fill Percentage</h3>
          <p className="text-2xl font-bold text-blue-600">
            {orderImpact.fillPercentage.toFixed(1)}%
          </p>
        </div>
       
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Market Impact</h3>
          <p className={`text-2xl font-bold ${getImpactColor(orderImpact.marketImpact)}`}>
            {orderImpact.marketImpact.toFixed(3)}%
          </p>
        </div>
       
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Slippage</h3>
          <p className={`text-2xl font-bold ${getImpactColor(orderImpact.slippage)}`}>
            {orderImpact.slippage.toFixed(3)}%
          </p>
        </div>
       
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Est. Fill Time</h3>
          <p className="text-2xl font-bold text-purple-600">
            {formatTime(orderImpact.estimatedFillTime)}
          </p>
        </div>
      </div>
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Order Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Venue:</span> {order.venue.toUpperCase()}
          </div>
          <div>
            <span className="font-medium">Symbol:</span> {order.symbol}
          </div>
          <div>
            <span className="font-medium">Type:</span> {order.type.toUpperCase()}
          </div>
          <div>
            <span className="font-medium">Side:</span> {order.side.toUpperCase()}
          </div>
          <div>
            <span className="font-medium">Quantity:</span> {order.quantity}
          </div>
          <div>
            <span className="font-medium">Avg Fill Price:</span> ${orderImpact.averageFillPrice.toFixed(2)}
          </div>
        </div>
      </div>
      {orderImpact.fillPercentage < 100 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-1"> Partial Fill Warning</h4>
          <p className="text-sm text-yellow-700">
            This order may not be completely filled due to insufficient liquidity.
            Only {orderImpact.fillPercentage.toFixed(1)}% of the order can be executed.
          </p>
        </div>
      )}
      {orderImpact.slippage > 1 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-medium text-red-800 mb-1"> High Slippage Alert</h4>
          <p className="text-sm text-red-700">
            This order will experience significant slippage ({orderImpact.slippage.toFixed(2)}%).
            Consider reducing order size or using limit orders.
          </p>
        </div>
      )}
    </div>
  );
};