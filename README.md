# Real-Time Crypto Orderbook Viewer & Simulator

View live order books, simulate orders, and analyze market impact across multiple cryptocurrency exchanges (OKX, Bybit, Deribit).

## 🚀 Features

- **Live Orderbook Streaming:** Real-time updates via public WebSocket APIs, with automatic fallback to HTTP polling if live data is unavailable.
- **Venue-Agnostic Simulation:** Simulate market and limit buy/sell orders and analyze slippage, fill percentage, and market impact.
- **Multi-Venue Support:** OKX, Bybit, and Deribit (spot/linear/perpetual pairs).
- **Depth Chart Visualization:** Interactive, cumulative depth chart using Recharts.
- **Responsive Design:** Usable on mobile and desktop, styled with Tailwind CSS.
- **Order Impact Analysis:** Visual explainers of partial fill, high slippage, and edge cases.
- **Health/Fallback Mechanism:** If APIs or websockets fail, local mock data is used so the UI remains operational.


# Getting Started
## Requirements
Install & Run:

```bash
git clone https://github.com/JuhiRai007/Real-Time-Orderbook-Viewer-with-Order-Simulation.git
cd Real-Time-Orderbook-Viewer-with-Order-Simulation
npm install
npm run dev # Launch at http://localhost:3000


```
### Build for Production
```bash
npm run build && npm start

```
## Libraries Used

- **React (v18):** UI & state management
- **Next.js (v14):** App framework, SSR, routing
- **Tailwind CSS:** Utility-first styling
- **Recharts:** For depth chart rendering
- **ws:** WebSocket support (for SSR/server-side use/exchange proxying)
- **lucide-react:** For UI icons, if needed

## Project Architecture and Assumptions

- **No authentication required:** Only public market data endpoints are accessed.
- **API Routes:** (`/api/okx/…`, etc.) are handled by Next.js API routes that proxy to the exchanges. No client browser talks directly to exchange HTTP APIs.
- **WebSocket Connectivity:** All order book subscriptions use public endpoints; fallback to polling is automatic if WebSocket data goes stale for more than 15s.
- **Stateless Client:** All app state is kept in React; no persistent backend or user sessions.
- **Symbol/Venue Configuration:** Symbols per venue are hardcoded for the demo; production would fetch dynamically.
- **No sensitive data stored or sent.**
- **No API keys required or used.**
- **This is a simulation only; no real trades are executed.**

## Directory Structure

- `/components/OrderForm.js` — UI for submitting simulated orders
- `/components/OrderbookDisplay.js` — Responsive live orderbook table display
- `/components/OrderVisualization.js` — Shows order impact, fill percentage, slippage
- `/components/DepthChart.js` — Depth chart visualization (bid/ask ladders)
- `/hooks/useOrderbook.js` — Connects to WS or HTTP orderbook data (with error handling, throttling, and fallback)
- `/services/api.js` — Fetches orderbook/tickers from various APIs; symbol normalization
- `/services/orderCalculations.js` — Market/limit order simulation and impact logic
- `/services/websocket.js` — WebSocket abstraction with reconnects, subscription management

## Supported Venues & API References

- **OKX**
  - API: [OKX API Docs](https://www.okx.com/docs-v5/en/)
  - WebSocket: `wss://ws.okx.com:8443/ws/v5/public` (rate limit: see docs)

- **Bybit**
  - API: [Bybit API Docs](https://bybit-exchange.github.io/docs/v5/intro)
  - WebSocket: `wss://stream.bybit.com/v5/public/linear`

- **Deribit**
  - API: [Deribit API Docs](https://docs.deribit.com/)
  - WebSocket: `wss://www.deribit.com/ws/api/v2`
 
> **Note:**  
> The app uses Next.js API routes (`/api/okx/*`, `/api/bybit/*`, etc.) as a backend proxy, allowing CORS-free requests on client.

---

## 🛡️ Rate Limiting & Usage Notes

Each exchange enforces its own **rate limits** (see their official docs).

- **WebSocket connections** may be dropped if you open too many or send too many messages.
- **HTTP polling** is rate limited; excessive polling may result in bans or IP restrictions.

**Automatic Fallback:**  
If WebSocket data is not received in 15 seconds, the app automatically switches to HTTP polling every 3s and notifies the user visually.

- [OKX REST Limits](https://www.okx.com/docs-v5/en/#rest-api-rate-limit)
- [Bybit REST Limits](https://bybit-exchange.github.io/docs/v5/rate-limit)
- [Deribit REST Limits](https://docs.deribit.com/#rate-limits)

In production or for heavy use, implement per-user throttling and server-side caching.

## ⚙️ Customization

- To adjust supported symbols/venues, see `VENUE_SYMBOLS` in `index/page.js` or update `services/api.js`.
- For custom API endpoints, edit `/services/api.js` and `/services/websocket.js`.

---

## ⚠️ Limitations & Warnings

- Demo only. **No trading actually occurs.**
- Not suitable for high-frequency production use as-is.
- Unexpected changes in exchange API response formats may cause parsing failures.
- Some exchanges throttle hard—respect their ToS and use within rate limits!

  
## 🚦 How To Use

1. **Choose an exchange** using the Venue selector.
2. **Choose a symbol** (trading pair) from the symbol dropdown.
3. **View the live orderbook** on the right side and the cumulative depth chart (toggle as desired).
4. **Simulate a trade** (buy/sell, market/limit) using the Order Simulation form.
5. **Analyze the impact:** See statistics on fill %, slippage, estimated fill time, and get warnings for partial fills or high slippage.

---

## 🏅 Acknowledgements

- Built with [Next.js](https://nextjs.org), [Tailwind CSS](https://tailwindcss.com), [Recharts](https://recharts.org)
- Uses public APIs from [OKX](https://www.okx.com), [Bybit](https://www.bybit.com), [Deribit](https://www.deribit.com)

---

## ✅ Assumptions Recap

- No private keys or credentials required—**public spot orderbook data only**.
- All UI is responsive and accessible.
- App runs client-side in a browser; no private server infrastructure is required.
- All exchange rate limits/usage policies are respected (see above).



