# Fit4Life-Backend — Diagrams

Component-level diagrams for the FastAPI service. For how this service
fits into the whole system, see [../DIAGRAMS.md](../DIAGRAMS.md). For
the frontend that calls this API, see
[../Fit4Life-UI/DIAGRAMS.md](../Fit4Life-UI/DIAGRAMS.md). For the
schema this service reads/writes, see
[../SQLite-Docker/DIAGRAMS.md](../SQLite-Docker/DIAGRAMS.md).

## 1. Component diagram

```mermaid
flowchart TD
    subgraph entry["Entry point"]
        MAIN["main.py<br/>FastAPI app"]
    end

    subgraph mw["middleware/"]
        CORS["cors.py<br/>install_cors()"]
        AUTHMW["auth.py<br/>verify_jwt()"]
    end

    subgraph routers["endpoints/ (APIRouters)"]
        HEALTHEP["health_endpoint.py<br/>GET /api/health"]
        AUTHEP["auth_endpoint.py<br/>POST /api/auth/signup<br/>POST /api/auth/signin"]
        RUNSEP["runs_endpoint.py<br/>GET/POST /api/runs<br/>DELETE /api/runs/:id"]
    end

    subgraph scripts["scripts/ (business logic)"]
        HEALTHSC["health_script.py"]
        AUTHSC["auth_script.py<br/>argon2 hash/verify, JWT encode"]
        RUNSSC["runs_script.py"]
    end

    subgraph models["models/ (Pydantic)"]
        MAUTH["auth.py"]
        MRUNS["runs.py"]
        MCOMMON["common.py<br/>SuccessEnvelope"]
    end

    subgraph data["db/ + config/"]
        CONN["connection.py<br/>get_db_connection()"]
        SETTINGS["settings.py<br/>get_settings(), get_jwt_secret()"]
    end

    ERR["lib/errors.py<br/>register_exception_handlers()<br/>raise_http()"]
    SQLITE[("SQLite file<br/>/data/fit4life.db")]

    MAIN --> CORS
    MAIN --> ERR
    MAIN --> HEALTHEP & AUTHEP & RUNSEP

    HEALTHEP --> HEALTHSC
    AUTHEP --> AUTHSC
    RUNSEP --> AUTHMW
    RUNSEP --> RUNSSC

    AUTHEP -.uses.-> MAUTH
    RUNSEP -.uses.-> MRUNS
    HEALTHEP -.uses.-> MCOMMON

    AUTHSC --> CONN
    RUNSSC --> CONN
    AUTHSC --> SETTINGS
    AUTHMW --> SETTINGS
    CONN --> SQLITE
```

## 2. Data flow diagram (backend-internal)

```mermaid
flowchart LR
    FE((Frontend))

    subgraph Backend
        AUTHP["Auth process<br/>(auth_endpoint + auth_script)"]
        JWTCHECK{"JWT valid?<br/>(middleware/auth.py)"}
        RUNSP["Runs process<br/>(runs_endpoint + runs_script)"]
        HEALTHP["Health process"]
    end

    D1[("D1 — users<br/>user_id, username, email,<br/>password_hash, created_at")]
    D2[("D2 — runs<br/>run_id, user_id FK, run_date,<br/>distance_mi, duration_minutes")]

    FE -- "email, password, name" --> AUTHP
    AUTHP -- "hash + insert" --> D1
    AUTHP -- "select + verify hash" --> D1
    AUTHP -- "signed JWT (sub=user_id)" --> FE

    FE -- "Authorization: Bearer JWT" --> JWTCHECK
    JWTCHECK -- "reject 401" --> FE
    JWTCHECK -- "AuthedUser{sub, email}" --> RUNSP
    RUNSP -- "select/insert/delete<br/>WHERE user_id = sub" --> D2
    RUNSP -- "run list / delete confirmation" --> FE

    FE -- "GET /api/health" --> HEALTHP
    HEALTHP -- "{status: ok}" --> FE
```

## 3. Sequence — signup

```mermaid
sequenceDiagram
    participant UI as Frontend
    participant EP as auth_endpoint.py
    participant SC as auth_script.signup()
    participant PH as argon2 PasswordHasher
    participant DB as SQLite (users)

    UI->>EP: POST /api/auth/signup {email, password, name}
    EP->>SC: signup(email, password, name)
    SC->>PH: hash(password)
    PH-->>SC: password_hash
    SC->>DB: INSERT INTO users (username, email, password_hash)
    alt email or username already taken
        DB-->>SC: IntegrityError
        SC-->>EP: raise_http(SIGNUP_FAILED, 409)
        EP-->>UI: 409 { ok: false, error }
    else success
        DB-->>SC: user_id (lastrowid)
        SC-->>EP: SignupData{ user }
        EP-->>UI: 200 { ok: true, data: { user } }
    end
```

## 4. Sequence — signin (JWT issuance)

```mermaid
sequenceDiagram
    participant UI as Frontend
    participant EP as auth_endpoint.py
    participant SC as auth_script.signin()
    participant PH as argon2 PasswordHasher
    participant DB as SQLite (users)

    UI->>EP: POST /api/auth/signin {email, password}
    EP->>SC: signin(email, password)
    SC->>DB: SELECT user_id, username, email, password_hash WHERE email = ?
    DB-->>SC: row (or none)
    alt no matching row
        SC-->>EP: raise_http(AUTH_ERROR, 401)
        EP-->>UI: 401 Invalid email or password
    else row found
        SC->>PH: verify(password_hash, password)
        alt mismatch
            PH-->>SC: VerifyMismatchError
            SC-->>EP: raise_http(AUTH_ERROR, 401)
            EP-->>UI: 401 Invalid email or password
        else match
            SC->>SC: build payload {sub: user_id, email, iat, exp}<br/>exp = now + JWT_TTL_HOURS
            SC->>SC: jwt.encode(payload, JWT secret, HS256)
            SC-->>EP: SigninData{ token, user }
            EP-->>UI: 200 { ok: true, data: { token, user } }
            UI->>UI: localStorage.setItem(token, user)
        end
    end
```

## 5. Sequence — authenticated `/api/runs` request

Applies to `GET /api/runs`, `POST /api/runs`, and
`DELETE /api/runs/:run_id`; all go through the same JWT check before
reaching `runs_script`.

```mermaid
sequenceDiagram
    participant UI as Frontend
    participant EP as runs_endpoint.py
    participant MW as verify_jwt()
    participant SC as runs_script.py
    participant DB as SQLite (runs)

    UI->>EP: GET/POST /api/runs or DELETE /api/runs/:id<br/>Authorization: Bearer <token>
    EP->>MW: Depends(verify_jwt)
    alt missing/malformed/expired/invalid token
        MW-->>EP: raise_http(AUTH_ERROR, 401)
        EP-->>UI: 401
    else valid token
        MW-->>EP: AuthedUser{sub, email}
        EP->>SC: list_runs / add_runs / delete_run(authed, ...)
        SC->>SC: user_id = int(authed.sub)
        SC->>DB: SELECT/INSERT/DELETE ... WHERE user_id = ?
        alt delete_run and rowcount == 0
            DB-->>SC: 0 rows affected
            SC-->>EP: raise_http(RUN_NOT_FOUND, 404)
            EP-->>UI: 404
        else success
            DB-->>SC: rows
            SC-->>EP: RunOut[] or delete confirmation
            EP-->>UI: 200 { ok: true, data }
        end
    end
```

## 6. Error handling

All handlers funnel unexpected/known errors through a single exception
path so the frontend always sees the same envelope shape.

```mermaid
flowchart LR
    HANDLER["endpoint / script<br/>raise_http(code, message, status)"]
    REG["lib/errors.py<br/>register_exception_handlers(app)"]
    RESP["{ ok: false,<br/>error: { code, message, details? } }"]

    HANDLER --> REG --> RESP
```
