---
name: node-express-mongo-react
description: MVC backend with Node, Express, MongoDB/Mongoose, and React frontend (SDD stack)
---

## Project structure
```
server/
├── config/          # DB connection, env vars, cors, etc.
│   └── db.js
├── models/          # Mongoose schemas
│   └── User.js
├── controllers/     # Request handlers (req → validation → service → res)
│   └── userController.js
├── routes/          # Express routers
│   └── userRoutes.js
├── middleware/      # auth, error handler, validation, rate-limit
│   ├── auth.js
│   └── errorHandler.js
├── services/        # Business logic (optional, between controller & model)
│   └── userService.js
├── validators/      # Request schemas (express-validator or zod)
│   └── userValidator.js
├── utils/           # Helpers, constants, logger
│   └── ApiError.js
├── app.js           # Express app setup (middleware, routes)
└── server.js        # Entry point (listen, DB connect)
client/              # React frontend (Vite)
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/    # API client (axios/fetch wrappers)
│   ├── context/
│   └── App.jsx
├── index.html
└── vite.config.js
```

## Backend conventions (Node + Express + Mongoose)
- MVC pattern: Router → [Validator] → Controller → [Service] → Model
- Use `express.Router()` for modular routing
- Controllers never access `req`/`res` directly for logic — delegate to services
- Mongoose: use lean() for read-only queries, populate() for references
- Error handling: centralized `errorHandler` middleware, custom `ApiError` class with statusCode
- Use `http-status-codes` or numeric constants for status codes
- Environment variables via `dotenv` with a `.env.example` file
- Async error handling: wrap controllers with `express-async-errors` or a `catchAsync` utility
- Validators: use `express-validator` or `zod` for request validation
- Authentication: JWT with access + refresh tokens stored in httpOnly cookies
- Logging: use `morgan` for HTTP logs, `winston` or `pino` for application logs
- Use `cors` middleware with explicit origin whitelist
- Rate limiting with `express-rate-limit`

## Database conventions (MongoDB + Mongoose)
- Each model file exports a single Mongoose model
- Use indexes for frequently queried fields
- Enable timestamps: `{ timestamps: true }`
- Use virtuals for computed fields (avoid storing derived data)
- Prefer aggregation pipeline for complex queries over multiple queries in JS
- Use transactions for operations that modify multiple documents
- Use `select: false` on sensitive fields (passwords, tokens)
- Pre-save hooks for password hashing (bcrypt)

## Frontend conventions (React + Vite)
- Vite as build tool, not CRA
- Use `axios` with a centralized instance (baseURL, interceptors for auth)
- Organize API calls in `services/` — one file per resource
- Use React Router v6 with lazy routes
- Forms: `react-hook-form` + `zod` for validation
- State: React Context for auth/theme, TanStack Query for server state
- Error boundaries at route level
- Proxy API requests through Vite config to avoid CORS in dev

## API response format
```json
// Success
{ "data": { ... }, "message": "..." }
// List
{ "data": [...], "pagination": { "page": 1, "limit": 20, "total": 100 } }
// Error
{ "error": { "status": 400, "message": "...", "details": [...] } }
```
