Using Node.js 20, Tailwind CSS v3.4.19, and Vite v7.2.4

Tailwind CSS has been set up with the shadcn theme

Dev server runs on port 3801, connects to backend API on port 3800

Components (40+):
  accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb,
  button-group, button, calendar, card, carousel, chart, checkbox, collapsible,
  command, context-menu, dialog, drawer, dropdown-menu, empty, field, form,
  hover-card, input-group, input-otp, input, item, kbd, label, menubar,
  navigation-menu, pagination, popover, progress, radio-group, resizable,
  scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner,
  spinner, switch, table, tabs, textarea, toggle-group, toggle, tooltip

Usage:
  import { Button } from '@/components/ui/button'
  import { Card, CardHeader, CardTitle } from '@/components/ui/card'

Structure:
  src/components/ui/     shadcn/ui component library
  src/hooks/             Custom hooks (useAuth, useWebSocket, etc.)
  src/lib/               Utilities (cn helper, mockData fallback)
  src/pages/             Page components (11 pages)
  src/services/          API service layer (auth, plant, room, device, etc.)
  src/store/             React Context state management
  src/types/             TypeScript type definitions
  src/utils/             Data mappers (snake_case ↔ camelCase)
  src/App.css            Styles specific to the Webapp
  src/App.tsx            Root React component
  src/index.css          Global styles
  src/main.tsx           Entry point for rendering the Webapp
  index.html             Entry point for the Webapp
  tailwind.config.js     Configures Tailwind's theme, plugins, etc.
  vite.config.ts         Main build and dev server settings for Vite
  postcss.config.js      Config file for CSS post-processing tools
