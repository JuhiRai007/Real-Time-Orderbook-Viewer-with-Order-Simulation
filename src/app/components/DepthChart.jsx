'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const getCumulative = (data, type = 'buy') => {
  let cumulative = 0;
  return [...data]
    .sort((a, b) =>
      type === 'buy' ? b.price - a.price : a.price - b.price
    )
    .map((item) => {
      cumulative += item.size;
      return {
        price: item.price,
        cumulative: Number(cumulative.toFixed(6)), 
      };
    });
};




export const DepthChart = ({ orderbook }) => {
  if (!orderbook || !orderbook.bids || !orderbook.asks) return null;

  const bidData = getCumulative(orderbook.bids, 'buy');
  const askData = getCumulative(orderbook.asks, 'sell');

  return (
    <div className="w-full h-[400px]">
      <h2 className="text-xl font-semibold mb-2">
        Depth Chart : {orderbook.venue  ? orderbook.venue.toUpperCase()  : 'Unknown'} 
         -{ orderbook.symbol ? orderbook.symbol : ''}
      </h2>



      <ResponsiveContainer width="100%" height="100%">
        <AreaChart margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <XAxis
            type="number"
            dataKey="price"
            domain={['auto', 'auto']}
            tickFormatter={(value) => value.toFixed(2)}
            label={{ value: 'Price', position: 'insideBottom', offset: -10 }}
          />
          <YAxis
            type="number"
            dataKey="cumulative"
            domain={[0, 'auto']}
            label={{
              value: 'Cumulative Size',
              angle: -90,
              position: 'insideLeft',
            }}
          />
          <Tooltip
            formatter={(value, name) =>
              [value, name === 'bids' ? 'Bids' : 'Asks']
            }
            labelFormatter={(label) => `Price: ${label}`}
          />
          <Legend verticalAlign="top" height={36} />

          <Area
            data={bidData}
            type="stepAfter"
            dataKey="cumulative"
            stroke="#00C49F"
            fill="#00C49F"
            name="Bids"
          />
          <Area
            data={askData}
            type="stepAfter"
            dataKey="cumulative"
            stroke="#FF4C4C"
            fill="#FF4C4C"
            name="Asks"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
