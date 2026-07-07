
# Fit4Life UI

> See [DIAGRAMS.md](DIAGRAMS.md) for routing, user flow, and sequence diagrams.

React/TypeScript frontend for the Fit4Life fitness tracker application. Built with Vite, shadcn/ui, and Tailwind CSS.

## Directory Structure

```
Fit4Life-UI/
│
├── src/                        # Source code
│   ├── app/
│   │   ├── components/         # React components
│   │   │   ├── AddWorkout.tsx           # Workout creation component
│   │   │   ├── Dashboard.tsx            # Main dashboard page
│   │   │   ├── Login.tsx                # Login page
│   │   │   ├── Signup.tsx               # User registration page
│   │   │   ├── figma/
│   │   │   │   └── ImageWithFallback.tsx # Image component with fallback
│   │   │   └── ui/                      # UI component library (shadcn/ui)
│   │   │       ├── accordion.tsx        # Accordion component
│   │   │       ├── alert.tsx            # Alert component
│   │   │       ├── button.tsx           # Button component
│   │   │       ├── card.tsx             # Card component
│   │   │       ├── dialog.tsx           # Modal dialog component
│   │   │       ├── form.tsx             # Form component
│   │   │       ├── input.tsx            # Input field component
│   │   │       ├── dropdown-menu.tsx    # Dropdown menu component
│   │   │       ├── sidebar.tsx          # Sidebar navigation component
│   │   │       └── ... (other UI components)
│   │   ├── utils/              # Application utilities
│   │   │   ├── api.ts          # API client functions
│   │   │   └── auth.ts         # Authentication utilities
│   │   └── App.tsx             # Main application component
│   │
│   ├── styles/                 # Global styles
│   │   ├── globals.css         # Global styles
│   │   ├── theme.css           # Theme definitions
│   │   ├── tailwind.css        # Tailwind CSS imports
│   │   ├── fonts.css           # Font imports
│   │   └── index.css           # Style index
│   │
│   ├── test/                   # Test files
│   │   ├── AddWorkout.test.tsx     # AddWorkout component tests
│   │   ├── Login.test.tsx          # Login component tests
│   │   ├── Signup.test.tsx         # Signup component tests
│   │   ├── auth.test.ts            # Authentication utility tests
│   │   ├── setup.ts                # Test configuration and setup
│   │   └── mocks/
│   │       └── supabase-info.ts    # Mock Supabase client
│   │
│   └── main.tsx                # Application entry point
│
├── supabase/                   # Supabase configuration
│   └── functions/              # Supabase edge functions
│       └── server/
│           ├── index.tsx       # Server function entry point
│           └── kv_store.tsx    # Key-value store utilities
│
├── utils/                      # Shared utility functions
│   └── supabase/
│       └── info.tsx            # Supabase client initialization
│
├── guidelines/                 # Project guidelines and documentation
│   └── Guidelines.md           # Development guidelines
│
├── vite.config.ts              # Vite bundler configuration
├── postcss.config.mjs          # PostCSS and Tailwind configuration
├── package.json                # Node.js dependencies
├── pnpm-workspace.yaml         # pnpm workspace configuration
├── index.html                  # HTML entry point
├── ATTRIBUTIONS.md             # Third-party attributions
├── README.md                   # This file
└── .gitignore                  # Git ignore patterns
```

## Key Components

### `src/app/components/`
Main page and feature components:
- **Dashboard.tsx**: Home page displaying user statistics and recent workouts
- **Login.tsx**: User login page
- **Signup.tsx**: User registration page
- **AddWorkout.tsx**: Workout creation and editing form

### `src/app/components/ui/`
Reusable UI components from shadcn/ui collection:
- Form inputs, buttons, cards, dialogs
- Navigation components (sidebar, dropdown menus)
- Display components (alerts, badges, progress bars)
- All components are customizable with Tailwind CSS

### `src/app/utils/`
- **api.ts**: API client for communicating with backend
- **auth.ts**: Authentication helper functions (token management, user context)

### `src/styles/`
- Global styles, theme configuration, and Tailwind CSS setup
- Theme variables for colors, fonts, and spacing

### `src/test/`
- Unit and integration tests
- Mock Supabase client for testing

### `supabase/`
- Supabase edge functions and configuration
- Server-side utilities for database operations

## Setup and Installation

1. **Install dependencies**:
   ```bash
   pnpm install
   # or
   npm install
   ```

2. **Configure environment**:
   - Create `.env.local` file with necessary variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_API_URL=http://localhost:8000
   ```

3. **Start development server**:
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

4. **Build for production**:
   ```bash
   pnpm build
   # or
   npm run build
   ```

## Development

### Running Tests
Runs the full suite in `src/tests/` — unit tests for `api.ts` and the
dashboard utilities, plus the end-to-end workflow test
(`workflow.e2e.test.tsx`), which renders the whole app and drives a
signup → log run → logout flow with only `fetch` mocked at the network
boundary:

```bash
pnpm test
# or
npm test
```

### Code Quality
```bash
pnpm lint    # ESLint
pnpm format  # Prettier
```

## Technology Stack

- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **UI Framework**: shadcn/ui
- **Styling**: Tailwind CSS
- **State Management**: React Context / Supabase Realtime
- **HTTP Client**: Axios or Fetch API
- **Testing**: Vitest/Jest
- **Backend Integration**: Supabase, custom REST API

## Project Notes

- Originally generated from Figma design
- In process of replacing mocked database logic with real backend API
- Uses Supabase for authentication and real-time features
- Integrates with Fit4Life-Backend API for workout data management

