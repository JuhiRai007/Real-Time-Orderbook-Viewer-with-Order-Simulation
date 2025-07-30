export const calculateOrderImpact = (order, orderbook) => {
  const relevantSide = order.side === 'buy' ? orderbook.asks : orderbook.bids;
  
  if (order.type === 'market') {
    return calculateMarketOrderImpact(order, relevantSide);
  } else {
    return calculateLimitOrderImpact(order, relevantSide);
  }
};

const calculateMarketOrderImpact = (order, bookSide) => {
  let remainingQuantity = order.quantity;
  let totalCost = 0;
  let fillPercentage = 0;
  let worstPrice = 0;
  
  for (const level of bookSide) {
    if (remainingQuantity <= 0) break;
    
    const fillQuantity = Math.min(remainingQuantity, level.size);
    totalCost += fillQuantity * level.price;
    remainingQuantity -= fillQuantity;
    worstPrice = level.price;
    
    if (remainingQuantity <= 0) {
      fillPercentage = 100;
      break;
    }
  }
  
  if (remainingQuantity > 0) {
    fillPercentage = ((order.quantity - remainingQuantity) / order.quantity) * 100;
  }
  
  const averageFillPrice = totalCost / (order.quantity - remainingQuantity);
  const bestPrice = bookSide[0]?.price || 0;
  const slippage = Math.abs((averageFillPrice - bestPrice) / bestPrice) * 100;
  const marketImpact = Math.abs((worstPrice - bestPrice) / bestPrice) * 100;
  
  return {
    fillPercentage,
    marketImpact,
    slippage,
    estimatedFillTime: fillPercentage === 100 ? 0 : -1,
    averageFillPrice
  };
};

const calculateLimitOrderImpact = (order, bookSide) => {
  if (!order.price) {
    return {
      fillPercentage: 0,
      marketImpact: 0,
      slippage: 0,
      estimatedFillTime: -1,
      averageFillPrice: order.price || 0
    };
  }
  
  const bestPrice = bookSide[0]?.price || 0;
  const isAggressiveOrder = order.side === 'buy' ? 
    order.price >= bestPrice : 
    order.price <= bestPrice;
  
  if (isAggressiveOrder) {
    return calculateMarketOrderImpact(order, bookSide);
  } else {
    const slippage = Math.abs((order.price - bestPrice) / bestPrice) * 100;
    
    return {
      fillPercentage: 0,
      marketImpact: 0,
      slippage,
      estimatedFillTime: estimateFillTime(order, bookSide),
      averageFillPrice: order.price
    };
  }
};

const estimateFillTime = (order, bookSide) => {
  const bestPrice = bookSide[0]?.price || 0;
  const priceDiff = Math.abs(order.price - bestPrice);
  const relativeDiff = priceDiff / bestPrice;
  
  if (relativeDiff < 0.001) return 30;
  if (relativeDiff < 0.01) return 300;
  if (relativeDiff < 0.05) return 1800;
  
  return -1;
};
