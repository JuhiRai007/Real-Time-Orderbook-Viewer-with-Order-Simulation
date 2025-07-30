import React, { useState, useEffect } from 'react';

export const OrderForm = ({ onOrderSubmit, venues, symbols, venue, symbol }) => {
  const [formData, setFormData] = useState({
    venue: venues[0] || 'okx',
    symbol: symbols[0] || 'BTC-USDT',
    type: 'limit',
    side: 'buy',
    price: undefined,
    quantity: 0,
    timing: 'immediate',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      venue: venue || prev.venue,
      symbol: symbol || prev.symbol,
    }));
  }, [venue, symbol]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};

    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    if (formData.type === 'limit' && (!formData.price || formData.price <= 0)) {
      newErrors.price = 'Price must be greater than 0 for limit orders';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onOrderSubmit(formData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };


  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Order Simulation</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
            <select
              value={formData.venue}
              onChange={e => handleInputChange('venue', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {venues.map(venueOption => (
                <option key={venueOption} value={venueOption}>
                  {venueOption.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Symbol Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
            <select
              value={formData.symbol}
              onChange={e => handleInputChange('symbol', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {symbols.map(symbolOption => (
                <option key={symbolOption} value={symbolOption}>
                  {symbolOption}
                </option>
              ))}
            </select>
          </div>

          {/* Order Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="market">Market</option>
              <option value="limit">Limit</option>
            </select>
          </div>

          {/* Side Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Side
            </label>
            <select
              value={formData.side}
              onChange={(e) => handleInputChange('side', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>

          {/* Price Input (for limit orders) */}
          {formData.type === 'limit' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price || ''}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
                className={`w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${errors.price ? 'border-red-500' : 'border-gray-300'
                  }`}
                placeholder="Enter price"
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price}</p>
              )}
            </div>
          )}

          {/* Quantity Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              type="number"
              step="0.0001"
              value={formData.quantity || ''}
              onChange={(e) => handleInputChange('quantity', parseFloat(e.target.value))}
              className={`w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${errors.quantity ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="Enter quantity"
            />
            {errors.quantity && (
              <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
            )}
          </div>

          {/* Timing Simulation */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timing Simulation
            </label>
            <select
              value={formData.timing}
              onChange={(e) => handleInputChange('timing', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="immediate">Immediate</option>
              <option value="5s">5 seconds delay</option>
              <option value="10s">10 seconds delay</option>
              <option value="30s">30 seconds delay</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Simulate Order
        </button>
      </form>
    </div>
  );
};
