'use client';
import React, { useState } from 'react';
import { OrderbookDisplay } from '../app/components/OrderbookDisplay';
import { OrderForm } from '../app/components/OrderForm';
import { OrderVisualization } from '../app/components/OrderVisualization';
import { DepthChart } from '../app/components/DepthChart';
import { useOrderbook } from '../hooks/useOrderbook';
import { calculateOrderImpact } from '../services/orderCalculations';

const VENUE_SYMBOLS = {
  okx: ['BTC-USDT', 'ETH-USDT', 'BTC-USD', 'ETH-USD'],
  bybit: ['BTCUSDT', 'ETHUSDT'],
  deribit: ['BTC-PERPETUAL', 'ETH-PERPETUAL'],
};

const VENUES = Object.keys(VENUE_SYMBOLS);

export default function Home() {
  const [selectedVenue, setSelectedVenue] = useState('okx');
  const [selectedSymbol, setSelectedSymbol] = useState('BTC-USDT');

  // Store multiple timing scenarios for side-by-side comparison
  const [timingScenarios, setTimingScenarios] = useState([]);

  const [showDepthChart, setShowDepthChart] = useState(false);
  const [availableSymbols, setAvailableSymbols] = useState(VENUE_SYMBOLS['okx']);

  const { orderbook, loading, connectionStatus, error } = useOrderbook(
    selectedVenue,
    selectedSymbol
  );
  const isConnected = connectionStatus === 'connected';

  const handleOrderSubmit = (order) => {
    if (!orderbook) return;

    const impact = calculateOrderImpact(order, orderbook);
    setTimingScenarios((prev) => [...prev, { ...order, impact, timing: order.timing }]);
  };

  const handleVenueChange = (venue) => {
    const newSymbols = VENUE_SYMBOLS[venue];
    setSelectedVenue(venue);
    setAvailableSymbols(newSymbols);
    setSelectedSymbol(newSymbols[0]);
    setTimingScenarios([]); // Clear comparisons on venue change
  };

  const handleSymbolChange = (symbol) => {
    setSelectedSymbol(symbol);
    setTimingScenarios([]); // Clear comparisons on symbol change
  };

  const orderbookWithInfo = orderbook
    ? { ...orderbook, venue: selectedVenue, symbol: selectedSymbol }
    : null;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Real-Time Orderbook Viewer with Order Simulation</h1>
          <p className="text-gray-600">
            Simulate orders and analyze market impact across multiple venues
          </p>
        </div>

        {/* Venue and Symbol Selectors */}
        <div className="mb-6 bg-white rounded-lg shadow-lg p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
              <select
                value={selectedVenue}
                onChange={(e) => handleVenueChange(e.target.value)}
                className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {VENUES.map((venue) => (
                  <option key={venue} value={venue}>
                    {venue.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
              <select
                value={selectedSymbol}
                onChange={(e) => handleSymbolChange(e.target.value)}
                className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {availableSymbols.map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={() => setShowDepthChart(!showDepthChart)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {showDepthChart ? 'Hide' : 'Show'} Depth Chart
              </button>
            </div>

            {/* Connection Status */}
            <div className="ml-auto">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-sm text-gray-600">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="fixed top-5 right-5 z-50 p-4 bg-red-50 border border-red-200 rounded-lg shadow-lg">
            <p className="text-red-700 font-medium">Error: {error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <OrderForm
              onOrderSubmit={handleOrderSubmit}
              venues={VENUES}
              symbols={availableSymbols}
              venue={selectedVenue}
            />

            {timingScenarios.length > 1 && (
              <button
                className="mb-4 bg-red-100 text-red-700 px-3 py-1 rounded"
                onClick={() => setTimingScenarios([])}
              >
                Clear Comparisons
              </button>
            )}

            {timingScenarios.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                {timingScenarios.map((scenario, idx) => (
                  <OrderVisualization
                    key={idx}
                    order={scenario}
                    orderImpact={scenario.impact}
                    orderbook={orderbook}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {!showDepthChart && (
              <OrderbookDisplay
                orderbook={orderbookWithInfo}
                loading={loading}
                simulatedOrder={
                  timingScenarios.length > 0
                    ? timingScenarios[timingScenarios.length - 1]
                    : null
                }
                exchange={selectedVenue}
              />
            )}

            {showDepthChart && <DepthChart orderbook={orderbookWithInfo} />}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>
            Demo application - Real trading involves risk. This is for educational
            purposes only.
          </p>
        </div>
      </div>
    </div>
  );
}
