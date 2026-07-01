# Fit4Life-UI — Diagrams

Component-level diagrams for the React/Vite frontend. For how this
fits into the whole system, see [../DIAGRAMS.md](../DIAGRAMS.md). For
the API this frontend calls, see
[../Fit4Life-Backend/DIAGRAMS.md](../Fit4Life-Backend/DIAGRAMS.md).

## 1. Component diagram

```mermaid
flowchart TD
    ROOT["App.tsx<br/>BrowserRouter + Routes"]

    subgraph pages["components/ (pages)"]
        LOGIN["Login.tsx<br/>/login"]
        SIGNUP["Signup.tsx<br/>/signup"]
        DASH["Dashboard.tsx<br/>/dashboard (protected)"]
        ADD["AddWorkout.tsx<br/>/add-workout (protected)"]
    end

    PR["ProtectedRoute<br/>(defined in App.tsx)<br/>calls getSession()"]

    subgraph utils["utils/"]
        API["api.ts<br/>signUp, signIn, signOut,<br/>getSession, getRuns,<br/>addRuns, deleteRun"]
        DUTILS["dashboard-utils.ts<br/>groupByDay, filterByRange,<br/>formatPace, formatDuration"]
    end

    LS[("localStorage<br/>fit4life_token<br/>fit4life_user")]
    BACKEND["Fit4Life-Backend API<br/>:8000/api"]

    ROOT --> LOGIN
    ROOT --> SIGNUP
    ROOT --> PR --> DASH
    ROOT --> PR --> ADD

    LOGIN --> API
    SIGNUP --> API
    DASH --> API
    DASH --> DUTILS
    ADD --> API
    PR --> API

    API <--> LS
    API <-- "fetch /api/*" --> BACKEND
```

## 2. Routing / user flow

Mirrors the actual routing logic in `App.tsx`: unauthenticated users are
bounced to `/login`; `/` always redirects to `/dashboard` (which then
redirects to `/login` if there's no session).

```mermaid
flowchart TD
    Root["/ "] -->|"Navigate"| DashRoute["/dashboard"]

    DashRoute --> PR{"ProtectedRoute:<br/>getSession() resolved?"}
    PR -- "not yet (checked=false)" --> Blank["render nothing"]
    PR -- "no session" --> LoginRoute["Navigate to /login"]
    PR -- "session valid" --> Dashboard["Dashboard.tsx renders"]

    LoginPage["/login — Login.tsx"] -->|"submit valid creds"| Dashboard
    LoginPage -->|"'Sign Up' link"| SignupPage["/signup — Signup.tsx"]
    SignupPage -->|"submit: signUp() then signIn()"| Dashboard
    SignupPage -->|"'Log In' link"| LoginPage

    Dashboard -->|"Add Workout button"| AddRoute["/add-workout"]
    AddRoute --> PR2{"ProtectedRoute"}
    PR2 -- "no session" --> LoginPage
    PR2 -- "session valid" --> AddWorkout["AddWorkout.tsx renders"]
    AddWorkout -->|"save sessions"| Dashboard
    AddWorkout -->|"Back to Dashboard"| Dashboard

    Dashboard -->|"Logout"| SignOut["signOut(): clear localStorage"]
    SignOut --> LoginPage
    Dashboard -->|"session expired on mount"| LoginPage
```

## 3. Sequence — login

```mermaid
sequenceDiagram
    actor U as User
    participant L as Login.tsx
    participant API as api.ts
    participant BE as Backend

    U->>L: enter email/password, submit
    L->>API: signIn(email, password)
    API->>BE: POST /api/auth/signin
    BE-->>API: 200 { token, user } / 401 error
    alt success
        API->>API: localStorage.setItem(token, user)
        API-->>L: SessionUser
        L->>L: navigate('/dashboard')
    else failure
        API-->>L: throws Error(message)
        L->>L: setError(message)
    end
```

## 4. Sequence — signup

Signup immediately chains into signin so the user lands in an
authenticated session without a second manual login.

```mermaid
sequenceDiagram
    actor U as User
    participant S as Signup.tsx
    participant API as api.ts
    participant BE as Backend

    U->>S: enter name/email/password, submit
    S->>S: validate password length >= 6
    S->>API: signUp(email, password, name)
    API->>BE: POST /api/auth/signup
    BE-->>API: 200 { user } / 409 email or username taken
    API->>API: signIn(email, password)
    API->>BE: POST /api/auth/signin
    BE-->>API: 200 { token, user }
    API->>API: localStorage.setItem(token, user)
    API-->>S: SessionUser
    S->>S: navigate('/dashboard')
```

## 5. Sequence — dashboard load, add workout, delete run

```mermaid
sequenceDiagram
    actor U as User
    participant D as Dashboard.tsx
    participant AW as AddWorkout.tsx
    participant API as api.ts
    participant BE as Backend

    D->>API: getSession()
    alt no session
        API-->>D: null
        D->>D: navigate('/login')
    else session found
        API-->>D: { user, access_token }
        D->>API: getRuns()
        API->>BE: GET /api/runs (Bearer token)
        BE-->>API: { runs }
        API-->>D: RunSession[]
        D->>D: render charts + run list
    end

    U->>D: click "Add Workout"
    D->>AW: navigate('/add-workout')
    U->>AW: fill date/distance/duration (1..n sessions), submit
    AW->>AW: validate numbers > 0
    AW->>API: addRuns(sessions)
    API->>BE: POST /api/runs (Bearer token)
    BE-->>API: { runs }
    API-->>AW: RunSession[]
    AW->>D: navigate('/dashboard')

    U->>D: click delete on a run
    D->>D: confirm() dialog
    D->>API: deleteRun(id)
    API->>BE: DELETE /api/runs/:id (Bearer token)
    BE-->>API: { deleted: true } / 404
    API-->>D: void
    D->>D: remove run from local state
```

## 6. Data flow diagram (frontend-internal)

```mermaid
flowchart LR
    U((User))
    PAGES["Page components<br/>(Login, Signup, Dashboard, AddWorkout)"]
    APIMOD["api.ts<br/>(fetch + envelope parsing)"]
    LS[("localStorage<br/>token, user")]
    BE(("Backend API"))

    U -- "form input" --> PAGES
    PAGES -- "typed calls" --> APIMOD
    APIMOD -- "read token for Authorization header" --> LS
    APIMOD -- "write token/user on signin/signup" --> LS
    APIMOD -- "erase on signout/expiry" --> LS
    APIMOD -- "HTTP requests" --> BE
    BE -- "JSON envelope" --> APIMOD
    APIMOD -- "typed data or thrown Error" --> PAGES
    PAGES -- "rendered UI" --> U
```
