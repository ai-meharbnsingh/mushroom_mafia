# Mushroom Farm IoT — Frontend

React + TypeScript web dashboard for monitoring and controlling mushroom farm IoT devices.

## Tech Stack

- React 18 + TypeScript
- Vite v7.2.4 (dev server on port 3801)
- Tailwind CSS v3.4.19 with shadcn/ui components (40+)
- Axios for API communication
- WebSocket for real-time sensor updates

## Getting Started

```bash
npm install
npm run dev    # starts on http://localhost:3801
```

## Environment Variables

Create a `.env` file (see `.env` for defaults):

```
VITE_API_BASE_URL=http://localhost:3800/api/v1
VITE_WS_BASE_URL=ws://localhost:3800/api/v1
```

## Project Structure

```
src/
├── components/ui/     shadcn/ui components (40+)
├── hooks/             Custom hooks (useAuth, useWebSocket, etc.)
├── lib/               Utilities (cn, mockData fallback)
├── pages/             Page components (Dashboard, Plants, Rooms, etc.)
├── services/          API service layer (auth, plant, room, device, etc.)
├── store/             React Context state management (AppContext)
├── types/             TypeScript type definitions
└── utils/             Data mappers (snake_case ↔ camelCase)
```

## Pages

| Page | Description |
|------|-------------|
| Dashboard | Live overview with sensor charts, alerts, device status |
| Plants | CRUD management of mushroom plant types |
| Rooms | CRUD management of growing rooms |
| Room Detail | Live sensor readings, relay controls, threshold settings |
| Devices | Device list, room assignment |
| Alerts | Alert list with acknowledge/resolve actions |
| Reports | Generate and download farm reports |
| Users | User management (admin) |
| Settings | Threshold configuration per room |
| Profile | Password change |

## API Integration

- All API calls go through `src/services/api.ts` (Axios with JWT interceptor)
- Backend returns snake_case — mapped to camelCase via `src/utils/mappers.ts`
- WebSocket connection for real-time events: `sensor_update`, `relay_state_change`, `alert_created`
- JWT tokens stored in localStorage with automatic refresh on 401

## Build

```bash
npm run build    # outputs to dist/
```
