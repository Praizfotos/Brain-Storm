
## Backend: User entity — add username, avatar, and bio fields

**Description:**
The current `User` entity only stores `email`, `passwordHash`, `stellarPublicKey`, and `role`. The StrellerMinds backend exposes richer user profiles.

**Tasks:**
- Add `username: string` (unique, nullable) column to `user.entity.ts`
- Add `avatar: string` (nullable) column for profile image URL
- Add `bio: string` (nullable, text) column
- Add `isVerified: boolean` (default false) column for email verification status
- Add `UpdateUserDto` with validation decorators
- Add `PATCH /users/:id` endpoint in `UsersController` guarded by JWT + ownership check
- Write migration or ensure `synchronize` picks up changes in dev

---

## Backend: Auth — implement email verification flow

**Description:**
Registration currently returns a JWT immediately with no email verification. Production-grade platforms require users to verify their email before accessing protected resources.

**Tasks:**
- Generate a signed verification token (UUID or JWT with short TTL) on registration
- Store token hash in a `email_verifications` table or on the User entity
- Send verification email via Nodemailer (or a pluggable mail service) with a link to `GET /auth/verify?token=...`
- Implement `GET /auth/verify` endpoint that marks `user.isVerified = true` and invalidates the token
- Block login for unverified users (return `403` with clear message)
- Add `POST /auth/resend-verification` endpoint
- Add `EMAIL_*` env vars to `.env.example`

---

## Backend: Auth — implement password reset flow

**Description:**
There is no way for users to recover their account if they forget their password.

**Tasks:**
- Add `POST /auth/forgot-password` — accepts email, generates a time-limited reset token, sends email
- Add `POST /auth/reset-password` — accepts token + new password, validates token, updates hash, invalidates token
- Store reset tokens in a dedicated table with `expiresAt` column
- Ensure tokens are single-use
- Add rate limiting (max 3 requests per hour per email) using `@nestjs/throttler`

---

## Backend: Auth — add refresh token support

**Description:**
JWTs are currently long-lived with no refresh mechanism, which is a security risk.

**Tasks:**
- Issue a short-lived `access_token` (15 min) and a long-lived `refresh_token` (7 days) on login/register
- Store refresh token hash in the database linked to the user
- Implement `POST /auth/refresh` endpoint that validates the refresh token and issues a new access token
- Implement `POST /auth/logout` that invalidates the refresh token
- Rotate refresh tokens on each use (refresh token rotation)

---

## Backend: Auth — add Google OAuth2 strategy

**Description:**
StrellerMinds supports social login. Adding Google OAuth2 reduces friction for new users.

**Tasks:**
- Install `passport-google-oauth20` and `@nestjs/passport`
- Create `GoogleStrategy` with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` env vars
- Add `GET /auth/google` and `GET /auth/google/callback` endpoints
- On first OAuth login, create a user record with a random secure password hash and `isVerified = true`
- Return JWT pair on successful OAuth callback
- Add env vars to `.env.example`

---

## Backend: Courses — add Lesson and Module entities

**Description:**
Courses currently have no internal structure. StrellerMinds organises courses into modules and lessons.

**Tasks:**
- Create `Module` entity: `id`, `courseId`, `title`, `order`, `createdAt`
- Create `Lesson` entity: `id`, `moduleId`, `title`, `content` (text), `videoUrl` (nullable), `order`, `durationMinutes`, `createdAt`
- Add `OneToMany` relations: `Course → Module → Lesson`
- Create `ModulesService` and `LessonsService` with CRUD
- Expose `GET /courses/:id/modules`, `GET /modules/:id/lessons`
- Guard create/update/delete behind `Instructor` or `Admin` role

---

## Backend: Courses — add enrollment system

**Description:**
There is no way for students to enroll in courses. Enrollment is a prerequisite for progress tracking and credential issuance.

**Tasks:**
- Create `Enrollment` entity: `id`, `userId`, `courseId`, `enrolledAt`, `completedAt` (nullable)
- Add unique constraint on `(userId, courseId)`
- `POST /courses/:id/enroll` — authenticated student enrolls
- `GET /users/:id/enrollments` — list user's enrollments with progress
- `DELETE /courses/:id/enroll` — unenroll
- Emit an internal event `enrollment.created` for downstream hooks

---

## Backend: Courses — add course creation and update endpoints

**Description:**
`CoursesService` has a `create` method but no controller endpoint is exposed, and there is no update or delete.

**Tasks:**
- Add `POST /courses` — body: `CreateCourseDto` (title, description, level, durationHours); guard: `Admin | Instructor`
- Add `PATCH /courses/:id` — body: `UpdateCourseDto`; guard: ownership or Admin
- Add `DELETE /courses/:id` — soft-delete (`isDeleted` flag); guard: Admin
- Add `instructorId` FK column on `Course` entity referencing `User`
- Return `404` when course not found in `findOne`

---

## Backend: Courses — add course search and filtering

**Description:**
`GET /courses` returns all published courses with no filtering, pagination, or search.

**Tasks:**
- Add query params: `search` (title/description full-text), `level` (beginner|intermediate|advanced), `page` (default 1), `limit` (default 20)
- Implement cursor or offset pagination and return `{ data, total, page, limit }` envelope
- Add a `tsvector` index on `title` + `description` for PostgreSQL full-text search, or use `ILIKE` as a simpler fallback
- Document query params in Swagger with `@ApiQuery`

---

## Backend: Progress — create ProgressService synced with on-chain data

**Description:**
Progress is stored on-chain via the Analytics contract but the backend has no off-chain mirror, making it impossible to query progress without hitting the blockchain.

**Tasks:**
- Create `Progress` entity: `id`, `userId`, `courseId`, `lessonId` (nullable), `progressPct`, `completedAt` (nullable), `txHash` (nullable), `updatedAt`
- `POST /progress` — record lesson completion, update `progressPct`, trigger on-chain `record_progress` call via `StellarService`, store `txHash`
- `GET /users/:id/progress` — return all progress records
- Auto-issue credential when `progressPct` reaches 100 (call `StellarService.issueCredential`)

---

## Backend: Credentials — create CredentialsModule

**Description:**
Credential issuance is buried inside `StellarService` with no dedicated module, entity, or endpoints.

**Tasks:**
- Create `Credential` entity: `id`, `userId`, `courseId`, `txHash`, `issuedAt`, `stellarPublicKey`
- Create `CredentialsService` wrapping `StellarService.issueCredential`
- `GET /credentials/:userId` — list all credentials for a user
- `GET /credentials/verify/:txHash` — verify a credential on-chain and return status
- `POST /credentials/issue` — admin-only manual issuance endpoint
- Add Swagger docs

---

## Backend: Stellar — add token reward minting endpoint

**Description:**
The Token contract supports `mint_reward` but the backend has no endpoint to trigger it after course completion.

**Tasks:**
- Add `StellarService.mintReward(recipientPublicKey, amount)` that invokes the Token Soroban contract via `StellarRpc`
- Call `mintReward` automatically when a credential is issued
- Add `POST /stellar/mint` admin endpoint for manual minting
- Store `TOKEN_CONTRACT_ID` and `ANALYTICS_CONTRACT_ID` in env vars and `.env.example`

---

## Backend: Stellar — replace Horizon manageData with Soroban contract calls

**Description:**
`issueCredential` currently uses `Operation.manageData` on Horizon, which is a workaround. The proper approach is to call the Analytics Soroban contract.

**Tasks:**
- Install `@stellar/stellar-sdk` Soroban RPC client
- Refactor `issueCredential` to invoke `record_progress` on the Analytics contract with `progress_pct = 100`
- Add `SOROBAN_RPC_URL` env var (default: `https://soroban-testnet.stellar.org`)
- Keep Horizon fallback for balance queries
- Add error handling for RPC failures with retry logic (3 attempts, exponential backoff)

---

## Backend: Users — add role-based access control guards

**Description:**
The `role` field exists on `User` but there are no NestJS guards enforcing it on routes.

**Tasks:**
- Create `RolesGuard` using `Reflector` and a `@Roles(...roles)` decorator
- Apply `JwtAuthGuard` + `RolesGuard` globally or per-module
- Protect `POST /courses`, `PATCH /courses/:id`, `DELETE /courses/:id` with `[Admin, Instructor]`
- Protect `POST /credentials/issue` and `POST /stellar/mint` with `[Admin]`
- Add `GET /users` (list all users) protected by `[Admin]`
- Write unit tests for the guard

---

## Backend: Users — add admin user-management endpoints

**Description:**
There are no admin endpoints to manage users (list, ban, change role).

**Tasks:**
- `GET /admin/users` — paginated list with filters (role, isVerified, search by email)
- `PATCH /admin/users/:id/role` — change user role
- `PATCH /admin/users/:id/ban` — set `isBanned: boolean` flag; banned users receive `403` on login
- `DELETE /admin/users/:id` — soft-delete user
- All endpoints guarded by `Admin` role

---

## Backend: Notifications — create NotificationsModule

**Description:**
StrellerMinds sends in-app and email notifications for key events (enrollment, completion, credential issued).

**Tasks:**
- Create `Notification` entity: `id`, `userId`, `type` (enum), `message`, `isRead`, `createdAt`
- Use NestJS `EventEmitter2` to listen for `enrollment.created`, `credential.issued`, `progress.completed`
- On each event, create a `Notification` record and optionally send an email
- `GET /notifications` — authenticated user's notifications (unread first)
- `PATCH /notifications/:id/read` — mark as read
- `PATCH /notifications/read-all` — mark all as read

---

## Backend: Redis — implement caching layer

**Description:**
The backend has Redis listed as a dependency but it is not wired up.

**Tasks:**
- Install `@nestjs/cache-manager` and `cache-manager-redis-store`
- Register `CacheModule` globally with `REDIS_URL` env var
- Cache `GET /courses` response for 60 seconds
- Cache `GET /stellar/balance/:publicKey` for 30 seconds
- Invalidate course cache on create/update/delete
- Add `REDIS_URL` to `.env.example`

---

## Backend: Rate limiting — add throttler to all public endpoints

**Description:**
Public endpoints (login, register, balance lookup) have no rate limiting, making them vulnerable to brute-force and DoS.

**Tasks:**
- Install `@nestjs/throttler`
- Apply global throttler: 100 requests / 60 seconds per IP
- Apply stricter throttler on auth endpoints: 10 requests / 60 seconds
- Return `429 Too Many Requests` with `Retry-After` header
- Add `THROTTLE_TTL` and `THROTTLE_LIMIT` env vars

---

## Backend: Validation — add global exception filter and response envelope

**Description:**
Errors are returned in inconsistent formats. A global exception filter and response interceptor will standardise the API.

**Tasks:**
- Create `HttpExceptionFilter` that returns `{ statusCode, message, timestamp, path }`
- Create `TransformInterceptor` that wraps successful responses in `{ data, statusCode, timestamp }`
- Register both globally in `main.ts`
- Ensure Swagger reflects the envelope shape via `@ApiResponse` decorators on all controllers

---

## Backend: Database — add TypeORM migrations setup

**Description:**
`synchronize: true` is used in development but there is no migrations workflow for production.

**Tasks:**
- Add `data-source.ts` exporting a `DataSource` configured from env vars
- Add `typeorm:generate`, `typeorm:run`, `typeorm:revert` npm scripts
- Create initial migration from current entities
- Set `synchronize: false` when `NODE_ENV=production`
- Document migration workflow in `docs/migrations.md`

---

## Backend: Logging — integrate structured logging with Winston

**Description:**
`console.log` and NestJS default logger are used. Production needs structured, levelled, JSON logs.

**Tasks:**
- Install `nest-winston` and `winston`
- Configure Winston with `json` format in production, `colorize` in development
- Add log levels: `error`, `warn`, `info`, `debug`
- Replace all `console.log` calls with the injected logger
- Add `LOG_LEVEL` env var (default: `info`)
- Ship logs to stdout so container orchestrators can collect them

---

## Backend: Health check — add `/health` endpoint

**Description:**
There is no health check endpoint for load balancers and container orchestrators.

**Tasks:**
- Install `@nestjs/terminus`
- Add `GET /health` returning database connectivity, Redis connectivity, and Stellar Horizon reachability
- Return `200` when healthy, `503` when any check fails
- Add to CI smoke test after deployment

---

## Backend: Config — centralise configuration with `@nestjs/config` validation

**Description:**
Env vars are accessed directly via `process.env` with no validation, so missing vars cause runtime crashes.

**Tasks:**
- Create `config/configuration.ts` exporting a typed config factory
- Use `Joi` or `zod` schema to validate all required env vars at startup
- Inject `ConfigService` everywhere instead of `process.env`
- Fail fast with a descriptive error if required vars are missing

---

## Backend: Testing — add unit tests for AuthService

**Description:**
There are no unit tests in the backend.

**Tasks:**
- Set up Jest with `@nestjs/testing`
- Write unit tests for `AuthService.register` (happy path, duplicate email)
- Write unit tests for `AuthService.login` (happy path, wrong password, user not found)
- Mock `UsersService` and `JwtService`
- Achieve ≥ 80% coverage on `auth/` directory
- Add test script to CI

---

## Backend: Testing — add unit tests for CoursesService and UsersService

**Description:**
Core service logic has no test coverage.

**Tasks:**
- Unit test `CoursesService.findAll`, `findOne`, `create`
- Unit test `UsersService.create`, `findByEmail`, `findById`
- Mock TypeORM repositories using `jest.fn()`
- Unit test `StellarService.getAccountBalance` and `issueCredential` with mocked Horizon SDK
- Achieve ≥ 80% coverage on `courses/`, `users/`, `stellar/` directories

---

## Backend: Testing — add e2e tests for auth and courses flows

**Description:**
End-to-end tests validate the full HTTP request/response cycle including middleware and guards.

**Tasks:**
- Set up `supertest` with an in-memory SQLite database for e2e tests
- Test `POST /auth/register` → `POST /auth/login` → `GET /courses` flow
- Test protected route returns `401` without token
- Test role guard returns `403` for insufficient role
- Run e2e tests in CI as a separate job

---

## Backend: Docker — add Dockerfile and docker-compose for local dev

**Description:**
There is no Docker setup, making local environment setup error-prone.

**Tasks:**
- Add `apps/backend/Dockerfile` (multi-stage: build → production)
- Add `docker-compose.yml` at repo root with services: `backend`, `postgres`, `redis`
- Add `docker-compose.override.yml` for development with hot-reload via `ts-node-dev`
- Add `.dockerignore`
- Document Docker usage in README

---

## Backend: Security — add Helmet and CORS hardening

**Description:**
`app.enableCors()` allows all origins. Helmet is not configured.

**Tasks:**
- Install `helmet`
- Call `app.use(helmet())` in `main.ts`
- Configure CORS to allow only `ALLOWED_ORIGINS` env var (comma-separated list)
- Add `ALLOWED_ORIGINS` to `.env.example`
- Add `Content-Security-Policy` header

---

## Backend: Swagger — enrich API documentation

**Description:**
Swagger is set up but most endpoints lack `@ApiOperation`, `@ApiResponse`, and `@ApiBody` decorators.

**Tasks:**
- Add `@ApiOperation({ summary })` to every controller method
- Add `@ApiResponse` for success (200/201) and error (400/401/403/404) cases
- Add `@ApiBody` with example payloads
- Add `@ApiBearerAuth()` to all protected endpoints
- Export OpenAPI JSON to `docs/openapi.json` as part of the build

---

## Backend: Payments — add BST token balance endpoint per user

**Description:**
Users need to see their BST token balance from the Token contract.

**Tasks:**
- Add `GET /users/:id/token-balance` that reads the user's `stellarPublicKey`, calls `TokenContract.balance` via Soroban RPC, and returns the balance
- Cache result for 30 seconds in Redis
- Return `404` if user has no `stellarPublicKey` linked
- Add Swagger docs

---

## Frontend: Auth — build Register page

**Description:**
`/auth/register` is linked from the homepage but the page does not exist.

**Tasks:**
- Create `app/auth/register/page.tsx` with a form: email, password, confirm password
- Use `react-hook-form` + `zod` for client-side validation
- Call `POST /auth/register` via the `api` client on submit
- Store returned `access_token` in `localStorage` and redirect to `/dashboard`
- Show inline field errors and a loading spinner on submit
- Add link to `/auth/login`

---

## Frontend: Auth — build Login page

**Description:**
There is no login page.

**Tasks:**
- Create `app/auth/login/page.tsx` with email + password form
- Validate with `react-hook-form` + `zod`
- Call `POST /auth/login`, store token, redirect to `/dashboard`
- Show "Invalid credentials" error from API response
- Add "Forgot password?" link to `/auth/forgot-password`
- Add link to `/auth/register`

---

## Frontend: Auth — build Forgot Password and Reset Password pages

**Description:**
No password recovery UI exists.

**Tasks:**
- Create `app/auth/forgot-password/page.tsx` — email input, calls `POST /auth/forgot-password`, shows success message
- Create `app/auth/reset-password/page.tsx` — reads `?token=` from URL, new password + confirm, calls `POST /auth/reset-password`
- Handle expired/invalid token error with a clear message and link back to forgot-password

---

## Frontend: Auth — implement auth context and protected routes

**Description:**
There is no global auth state. Any page can be accessed without a token.

**Tasks:**
- Create `lib/auth-context.tsx` using React Context + `useReducer` to hold `user`, `token`, `isLoading`
- On app load, decode the stored JWT and populate context (check expiry)
- Create `components/ProtectedRoute.tsx` that redirects to `/auth/login` if unauthenticated
- Wrap `/dashboard`, `/courses/:id`, `/profile` with `ProtectedRoute`
- Expose `useAuth()` hook

---

## Frontend: Dashboard — build student dashboard page

**Description:**
There is no dashboard after login.

**Tasks:**
- Create `app/dashboard/page.tsx` showing:
  - Welcome message with user's name/email
  - Enrolled courses with progress bars
  - BST token balance (fetched from `GET /users/:id/token-balance`)
  - Recent credentials earned
- Fetch data server-side where possible (Next.js RSC) or client-side with SWR
- Show skeleton loaders while fetching

---

## Frontend: Courses — connect courses list to real API

**Description:**
`/courses` uses hardcoded mock data instead of fetching from the backend.

**Tasks:**
- Replace mock array with `GET /courses` API call using SWR or React Query
- Support `search`, `level`, and `page` query params mapped to URL search params
- Add a search input and level filter dropdown
- Add pagination controls (Previous / Next)
- Show a loading skeleton and an empty state when no courses match

---

## Frontend: Courses — build Course Detail page

**Description:**
`/courses/:id` is linked but the page does not exist.

**Tasks:**
- Create `app/courses/[id]/page.tsx`
- Fetch course details from `GET /courses/:id`
- Display: title, description, level, duration, instructor name
- List modules and lessons in an accordion
- Show "Enroll" button (calls `POST /courses/:id/enroll`) for unenrolled users
- Show progress bar and "Continue" button for enrolled users
- Handle 404 gracefully

---

## Frontend: Courses — build Lesson viewer page

**Description:**
There is no page to view lesson content.

**Tasks:**
- Create `app/courses/[id]/lessons/[lessonId]/page.tsx`
- Display lesson title, content (rendered Markdown via `react-markdown`), and optional video embed
- Add "Mark as Complete" button that calls `POST /progress`
- Show next/previous lesson navigation
- Update progress bar in real time after completion

---

## Frontend: Profile — build user profile page

**Description:**
There is no profile page for users to view or edit their information.

**Tasks:**
- Create `app/profile/page.tsx` (protected)
- Display: avatar, username, email, bio, role, joined date
- Add edit form for username, bio, avatar URL
- Call `PATCH /users/:id` on save
- Show linked Stellar public key with a "Link Wallet" button if not set

---

## Frontend: Wallet — build Stellar wallet linking flow

**Description:**
Users need to link their Stellar wallet to receive credentials and BST tokens.

**Tasks:**
- Add "Link Wallet" section to profile page
- Integrate `@stellar/freighter-api` to request the user's public key from Freighter wallet extension
- Call `PATCH /users/:id` with `stellarPublicKey`
- Show current linked key with a "Unlink" option
- Display BST balance once wallet is linked
- Handle Freighter not installed with an install prompt

---

## Frontend: Credentials — build credentials gallery page

**Description:**
There is no UI to view earned credentials.

**Tasks:**
- Create `app/credentials/page.tsx` (protected)
- Fetch from `GET /credentials/:userId`
- Display each credential as a card: course name, issued date, Stellar transaction hash
- Add "Verify on Stellar" link opening `https://stellar.expert/explorer/testnet/tx/:txHash`
- Add a shareable credential URL

---

## Frontend: Navigation — build persistent Navbar component

**Description:**
There is no navigation bar. Users must manually type URLs.

**Tasks:**
- Create `components/layout/Navbar.tsx`
- Show: Brain-Storm logo, "Courses", "Dashboard" (auth only), user avatar dropdown (Profile, Logout)
- Highlight active route using `usePathname`
- Responsive: hamburger menu on mobile
- Add to `RootLayout`

---

## Frontend: Navigation — build Footer component

**Description:**
No footer exists.

**Tasks:**
- Create `components/layout/Footer.tsx`
- Include: copyright, links to Docs, GitHub, Stellar network status badge
- Add to `RootLayout`

---

## Frontend: UI — build reusable component library

**Description:**
Only a `Button` component exists. A consistent component library is needed.

**Tasks:**
- `Input` — with label, error message, helper text
- `Select` — styled dropdown
- `Modal` — accessible dialog using `@radix-ui/react-dialog`
- `Badge` — for course level tags
- `ProgressBar` — animated, accessible
- `Spinner` — loading indicator
- `Toast` — notification using `react-hot-toast`
- `Card` — generic content card
- All components must be accessible (ARIA attributes, keyboard navigation)

---

## Frontend: State management — set up Zustand stores

**Description:**
Zustand is listed as a dependency but no stores are implemented.

**Tasks:**
- Create `store/auth.store.ts` — user, token, login/logout actions
- Create `store/courses.store.ts` — course list, selected course, filters
- Create `store/progress.store.ts` — per-course progress map
- Persist auth store to `localStorage` using `zustand/middleware`
- Replace ad-hoc `localStorage.getItem('token')` calls in `api.ts` with the store

---

## Frontend: SEO — add dynamic metadata per page

**Description:**
All pages share the same static metadata from `layout.tsx`.

**Tasks:**
- Add `generateMetadata` to `courses/[id]/page.tsx` using course title and description
- Add Open Graph and Twitter card tags
- Add `robots.txt` and `sitemap.xml` generation via `next-sitemap`
- Add canonical URL tags

---

## Frontend: Error handling — add global error boundary and 404/500 pages

**Description:**
Unhandled errors crash the entire app with no user-friendly message.

**Tasks:**
- Create `app/error.tsx` (Next.js error boundary) with a "Something went wrong" UI and retry button
- Create `app/not-found.tsx` with a 404 illustration and link back to home
- Add `api.ts` response interceptor that catches `401` and redirects to login, and surfaces other errors via toast

---

## Frontend: Instructor — build course creation form

**Description:**
Instructors have no UI to create courses.

**Tasks:**
- Create `app/instructor/courses/new/page.tsx` (protected, Instructor/Admin role)
- Form fields: title, description, level (select), durationHours
- Add module/lesson builder: add modules, reorder via drag-and-drop (`@dnd-kit/core`), add lessons to each module
- Submit calls `POST /courses` then `POST /courses/:id/modules` etc.
- Redirect to course detail on success

---

## Frontend: Admin — build admin dashboard

**Description:**
There is no admin interface.

**Tasks:**
- Create `app/admin/page.tsx` (Admin role only)
- Stats cards: total users, total courses, total credentials issued, total BST minted
- User management table: list, search, change role, ban
- Course management table: list, publish/unpublish, delete
- Fetch data from admin API endpoints

---

## Frontend: Testing — add Vitest + React Testing Library setup

**Description:**
There are no frontend tests.

**Tasks:**
- Install `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`
- Configure `vitest.config.ts`
- Write tests for `Button`, `Input`, `ProgressBar` components
- Write tests for `useAuth` hook (mock context)
- Write tests for `CoursesPage` (mock API with `msw`)
- Add test script to CI frontend job

---

## Frontend: Testing — add Playwright e2e tests

**Description:**
Critical user journeys need automated browser testing.

**Tasks:**
- Install `@playwright/test`
- Write test: register → login → browse courses → enroll → view lesson → mark complete
- Write test: credential appears in credentials page after completion
- Run Playwright tests in CI against a staging environment
- Add `playwright.config.ts`

---

## Frontend: Performance — add image optimisation and lazy loading

**Description:**
No image optimisation is configured.

**Tasks:**
- Replace all `<img>` tags with Next.js `<Image>` component
- Configure `next.config.js` with allowed image domains
- Add `loading="lazy"` to below-the-fold images
- Add `priority` to hero/above-the-fold images
- Run Lighthouse and target ≥ 90 performance score

---

## Frontend: Accessibility — audit and fix WCAG 2.1 AA compliance

**Description:**
No accessibility audit has been performed.

**Tasks:**
- Run `axe-core` audit on all pages
- Fix all critical and serious violations
- Ensure all interactive elements are keyboard-navigable
- Add `aria-label` to icon-only buttons
- Ensure colour contrast ratio ≥ 4.5:1 for all text
- Add skip-to-content link

---

## Frontend: Internationalisation — add i18n support

**Description:**
The platform targets a broad audience and should support multiple languages.

**Tasks:**
- Install `next-intl`
- Extract all UI strings to `messages/en.json`
- Add `messages/es.json` as a second locale
- Configure `next.config.js` with `i18n` settings
- Add language switcher to Navbar
- Ensure all dates/numbers use locale-aware formatting

---

## Frontend: Dark mode — add theme toggle

**Description:**
Only a light theme is available.

**Tasks:**
- Install `next-themes`
- Wrap app in `ThemeProvider`
- Add dark mode Tailwind classes to all components
- Add sun/moon toggle button to Navbar
- Persist preference in `localStorage`

---

## Contracts: Analytics — add persistent storage with TTL extension

**Description:**
The Analytics contract uses `instance` storage which has a fixed TTL. Long-lived progress records need `persistent` storage.

**Tasks:**
- Migrate `DataKey::Progress` storage from `instance()` to `persistent()`
- Call `env.storage().persistent().extend_ttl(&key, 100, 500)` on every read/write to keep records alive
- Add a `get_all_progress` function that returns a `Vec<ProgressRecord>` for a given student (requires iterating keys — use a secondary index map)
- Add `reset_progress` function callable only by an admin address stored at initialisation
- Write unit tests for all functions using `soroban_sdk::testutils`

---

## Contracts: Analytics — add course completion event emission

**Description:**
There is no on-chain event emitted when a student completes a course, making it hard for off-chain indexers to react.

**Tasks:**
- Emit a Soroban event via `env.events().publish(("analytics", "completed"), (student, course_id))` when `progress_pct == 100`
- Emit `("analytics", "progress_updated")` on every `record_progress` call
- Document event schema in `contracts/analytics/README.md`
- Write tests asserting events are emitted with correct data

---

## Contracts: Analytics — add admin initialisation and access control

**Description:**
Anyone can call `record_progress` on behalf of any student address. The contract needs proper auth.

**Tasks:**
- Add `initialize(env, admin: Address)` function storing admin in `instance` storage
- `record_progress` should only be callable by the student themselves OR the admin
- Add `set_admin(env, new_admin: Address)` callable only by current admin
- Write tests for unauthorised access attempts

---

## Contracts: Token — implement full SEP-0041 (Stellar Asset Contract) interface

**Description:**
The Token contract is a minimal custom implementation. It should conform to the SEP-0041 token interface so wallets and DEXes can interact with it natively.

**Tasks:**
- Implement all SEP-0041 functions: `initialize`, `mint`, `burn`, `transfer`, `transfer_from`, `approve`, `allowance`, `balance`, `decimals`, `name`, `symbol`, `total_supply`
- Store `name = "Brain-Storm Token"`, `symbol = "BST"`, `decimals = 7`
- Add `Allowance` data key for `transfer_from` / `approve`
- Emit transfer and approval events
- Write comprehensive unit tests for all token operations

---

## Contracts: Token — add vesting schedule for instructor rewards

**Description:**
Instructors should receive BST rewards that vest over time as students complete their courses.

**Tasks:**
- Add `VestingSchedule` struct: `beneficiary`, `total_amount`, `start_ledger`, `cliff_ledger`, `end_ledger`, `claimed`
- Add `create_vesting(env, admin, beneficiary, total_amount, cliff_ledger, end_ledger)` — admin only
- Add `claim_vesting(env, beneficiary)` — calculates vested amount, mints to beneficiary, updates `claimed`
- Store schedules in `persistent` storage
- Write tests for cliff, partial vest, and full vest scenarios

---

## Contracts: Token — add burn mechanism

**Description:**
There is no way to burn BST tokens, which is needed for governance and deflationary mechanics.

**Tasks:**
- Add `burn(env, from: Address, amount: i128)` — `from.require_auth()`, reduce balance, reduce `total_supply`
- Add `burn_from(env, spender: Address, from: Address, amount: i128)` — checks allowance
- Emit `("token", "burn")` event
- Write tests

---

## Contracts: Shared — expand RBAC with permission-level checks

**Description:**
The Shared contract assigns roles but has no granular permission checks.

**Tasks:**
- Define a `Permission` enum: `CreateCourse`, `EnrollStudent`, `IssueCredential`, `MintToken`, `ManageUsers`
- Add a `role_permissions` map: `Admin → all`, `Instructor → [CreateCourse, EnrollStudent]`, `Student → []`
- Add `has_permission(env, addr, permission) -> bool` function
- Update `assign_role` to emit a `("rbac", "role_assigned")` event
- Write tests for each permission/role combination

---

## Contracts: Shared — add reentrancy guard

**Description:**
The shared contract mentions reentrancy guards in the README but none are implemented.

**Tasks:**
- Implement a reentrancy guard using a `Locked` boolean flag in `instance` storage
- Create a `with_reentrancy_guard(env, f)` helper that sets the flag, runs `f`, then clears it
- Panic with `"reentrant call"` if the flag is already set
- Apply the guard to `mint_reward` in the Token contract and `record_progress` in Analytics
- Write a test that simulates a reentrant call and asserts it panics

---

## Contracts: Shared — add contract upgrade mechanism

**Description:**
Soroban contracts can be upgraded via `env.deployer().update_current_contract_wasm()`. This should be gated behind admin auth.

**Tasks:**
- Add `upgrade(env, admin: Address, new_wasm_hash: BytesN<32>)` to `SharedContract`
- `admin.require_auth()` before upgrading
- Emit `("shared", "upgraded")` event with the new wasm hash
- Document the upgrade process in `docs/contract-upgrades.md`
- Write a test using `soroban_sdk::testutils::MockAuth`

---

## Contracts: New — create CertificateNFT contract

**Description:**
Credentials are currently stored as `manageData` entries. A dedicated NFT-style certificate contract provides richer metadata and transferability control.

**Tasks:**
- Create `contracts/certificate/` with `Cargo.toml` and `src/lib.rs`
- Implement: `mint_certificate(env, admin, recipient, course_id, metadata_url)` — mints a non-transferable (soulbound) NFT
- Store: `CertificateRecord { id, owner, course_id, metadata_url, issued_at }`
- Add `get_certificate(env, id)` and `get_certificates_by_owner(env, owner)`
- Certificates are non-transferable: `transfer` panics with `"soulbound"`
- Add to `Cargo.toml` workspace and `scripts/build.sh`

---

## Contracts: New — create Governance contract

**Description:**
BST token holders should be able to vote on platform proposals (e.g., new course categories, fee changes).

**Tasks:**
- Create `contracts/governance/` 
- Implement: `create_proposal(env, proposer, title, description, voting_end_ledger)`
- Implement: `vote(env, voter, proposal_id, support: bool)` — weight = BST balance via cross-contract call to Token contract
- Implement: `execute_proposal(env, proposal_id)` — only if quorum met and voting ended
- Store proposals in `persistent` storage
- Write tests for proposal lifecycle

---

## Contracts: Testing — add unit tests for Analytics contract

**Description:**
The Analytics contract has no tests.

**Tasks:**
- Set up `soroban_sdk::testutils::{Address, Ledger}` test environment
- Test `record_progress` happy path (0%, 50%, 100%)
- Test `progress_pct > 100` panics
- Test `get_progress` returns `None` for unknown student/course
- Test completion event is emitted at 100%
- Test unauthorised caller is rejected

---

## Contracts: Testing — add unit tests for Token contract

**Description:**
The Token contract has no tests.

**Tasks:**
- Test `initialize` sets admin correctly
- Test `mint_reward` increases balance
- Test non-admin `mint_reward` panics
- Test `balance` returns 0 for unknown address
- Test `transfer` moves tokens between addresses
- Test `burn` reduces balance and total supply
- Achieve 100% function coverage

---

## Contracts: Testing — add unit tests for Shared contract

**Description:**
The Shared contract has no tests.

**Tasks:**
- Test `initialize` sets admin
- Test `assign_role` by admin succeeds
- Test `assign_role` by non-admin panics
- Test `has_role` returns correct boolean for each role
- Test `has_permission` for each role/permission combination
- Test reentrancy guard panics on reentrant call

---

## Contracts: Build — improve build and deploy scripts

**Description:**
`build.sh` and `deploy.sh` are minimal and do not handle multiple contracts or error cases.

**Tasks:**
- Update `build.sh` to loop over all contracts in `contracts/` directory
- Add `--release` flag and output WASM sizes
- Update `deploy.sh` to accept `CONTRACT_NAME` as argument, read contract ID from a `deployed-contracts.json` file
- Add `scripts/invoke.sh` for calling contract functions from CLI with env-var-based keypair
- Add error handling (`set -euo pipefail`) to all scripts
- Document all scripts in `docs/scripts.md`

---

## Testing: Backend — add integration tests with real PostgreSQL via Testcontainers

**Description:**
Unit tests mock the database. Integration tests should run against a real PostgreSQL instance to catch ORM and query issues.

**Tasks:**
- Install `testcontainers` Node.js library
- Spin up a PostgreSQL container before the test suite and tear it down after
- Run all TypeORM migrations against the test database
- Write integration tests for `CoursesService`, `UsersService`, `AuthService` using the real DB
- Add a `test:integration` npm script and a separate CI job

---

## Testing: Backend — add contract interaction tests with Soroban testnet

**Description:**
`StellarService` is never tested against an actual Soroban environment.

**Tasks:**
- Write a test that deploys the Analytics contract to a local Soroban sandbox (via `stellar-cli` subprocess)
- Call `record_progress` and assert the transaction succeeds
- Call `issueCredential` from `StellarService` and assert the returned hash is a valid transaction hash
- Run this test suite in CI only on `main` branch pushes (not PRs) to avoid rate limits

---

## Testing: Contracts — add fuzz tests for Analytics and Token contracts

**Description:**
Edge cases in contract arithmetic (overflow, underflow) need fuzz testing.

**Tasks:**
- Add `proptest` or `cargo-fuzz` to contract dev-dependencies
- Fuzz `record_progress` with random `progress_pct` values — assert only 0-100 are accepted
- Fuzz `mint_reward` with random `amount` values — assert negative amounts are rejected
- Fuzz `transfer` with random amounts — assert balance never goes negative
- Run fuzz tests in CI with a 60-second timeout

---

## Testing: Frontend — add visual regression tests with Chromatic

**Description:**
UI components can silently break visually without functional test failures.

**Tasks:**
- Set up Storybook for all UI components (`Button`, `Input`, `Card`, `Badge`, `ProgressBar`, `Modal`)
- Integrate Chromatic for visual regression testing
- Add Chromatic CI step that runs on every PR
- Configure baseline snapshots
- Add `CHROMATIC_PROJECT_TOKEN` to GitHub Actions secrets

---

## Testing: API — add contract testing with Pact

**Description:**
Frontend and backend can drift out of sync. Consumer-driven contract tests prevent this.

**Tasks:**
- Install `@pact-foundation/pact` in the frontend
- Write consumer pacts for: `GET /courses`, `POST /auth/login`, `GET /credentials/:userId`
- Publish pacts to a Pact Broker (or use Pactflow)
- Add provider verification in the backend test suite
- Add Pact verification to CI

---

## Testing: Load — add k6 load tests for critical API endpoints

**Description:**
No load testing exists. The platform needs to handle concurrent users.

**Tasks:**
- Install `k6`
- Write load test scripts for: `GET /courses` (500 VUs), `POST /auth/login` (100 VUs), `GET /stellar/balance/:key` (50 VUs)
- Define SLOs: p95 latency < 500ms, error rate < 1%
- Add `scripts/load-test.sh` to run k6
- Document how to run load tests in `docs/load-testing.md`

---

## Testing: Security — add OWASP ZAP security scan to CI

**Description:**
No automated security scanning is in place.

**Tasks:**
- Add OWASP ZAP baseline scan as a GitHub Actions job
- Target the staging backend URL
- Fail CI if any HIGH severity findings are detected
- Add `zap-report.html` as a CI artifact
- Document how to triage ZAP findings in `docs/security.md`

---

## Testing: Code quality — add ESLint and Prettier to frontend and backend

**Description:**
No linting or formatting is enforced.

**Tasks:**
- Add `.eslintrc.js` to `apps/frontend` and `apps/backend` with `@typescript-eslint` rules
- Add `.prettierrc` at repo root
- Add `lint` and `format:check` npm scripts to both apps
- Add lint steps to CI for both frontend and backend jobs
- Fix all existing lint errors

---

## Testing: Code quality — add SonarCloud static analysis

**Description:**
No static analysis tool is tracking code quality metrics over time.

**Tasks:**
- Create `sonar-project.properties` at repo root
- Add SonarCloud GitHub Action to CI
- Configure coverage report paths for backend (Jest) and frontend (Vitest)
- Set quality gate: coverage ≥ 70%, no new critical issues
- Add `SONAR_TOKEN` to GitHub Actions secrets

---

## Testing: Contracts — add `cargo audit` and `cargo deny` to CI

**Description:**
Rust dependencies are not audited for known vulnerabilities.

**Tasks:**
- Add `cargo audit` step to the contracts CI job
- Add `cargo deny check` with a `deny.toml` config (ban duplicate deps, check licenses)
- Fail CI on any CRITICAL or HIGH vulnerability
- Add `deny.toml` to repo root

---

## CI/CD: GitHub Actions — add staging deployment workflow

**Description:**
There is no automated deployment. Code merged to `main` should deploy to a staging environment.

**Tasks:**
- Create `.github/workflows/deploy-staging.yml` triggered on push to `main`
- Build and push Docker images to GitHub Container Registry (GHCR)
- SSH into staging server and run `docker-compose pull && docker-compose up -d`
- Run smoke tests (health check endpoint) after deployment
- Notify Slack on success/failure via webhook
- Add all required secrets to GitHub Actions

---

## CI/CD: GitHub Actions — add production deployment workflow with manual approval

**Description:**
Production deployments should require a manual approval step.

**Tasks:**
- Create `.github/workflows/deploy-production.yml` triggered on GitHub Release creation
- Add `environment: production` with required reviewers in GitHub repo settings
- Deploy only after approval
- Tag Docker images with the release version
- Run database migrations as part of deployment
- Add rollback step that redeploys the previous image tag on failure

---

## CI/CD: GitHub Actions — add dependency update automation with Dependabot

**Description:**
Dependencies are never automatically updated.

**Tasks:**
- Add `.github/dependabot.yml` configuring weekly updates for:
  - `npm` packages in `apps/frontend` and `apps/backend`
  - `cargo` crates in `contracts/`
  - GitHub Actions versions
- Set `assignees` and `reviewers` for Dependabot PRs
- Group minor/patch updates into a single PR per ecosystem

---

## CI/CD: GitHub Actions — add PR labeller and size checker

**Description:**
PRs have no automatic labels or size warnings.

**Tasks:**
- Add `.github/labeler.yml` to auto-label PRs by changed file paths (frontend, backend, contracts, docs)
- Add a PR size check that warns (not fails) when a PR changes > 500 lines
- Add PR template at `.github/pull_request_template.md` with checklist: tests added, docs updated, breaking changes noted

---

## CI/CD: Docker — add production-optimised Dockerfiles

**Description:**
No Dockerfiles exist for production builds.

**Tasks:**
- `apps/backend/Dockerfile`: multi-stage — `node:20-alpine` builder → `node:20-alpine` runner, non-root user, `HEALTHCHECK`
- `apps/frontend/Dockerfile`: multi-stage — build Next.js standalone output → minimal runner image
- Add `.dockerignore` to each app
- Add `docker-compose.prod.yml` with resource limits and restart policies
- Document image sizes and optimisation decisions

---

## CI/CD: Infrastructure — add Terraform config for cloud deployment

**Description:**
There is no infrastructure-as-code for deploying the platform.

**Tasks:**
- Create `infra/terraform/` with modules for: VPC, EC2/ECS, RDS PostgreSQL, ElastiCache Redis, ALB
- Use `terraform.tfvars.example` for variable documentation
- Add `infra/terraform/README.md` with apply instructions
- Add Terraform plan/apply to a separate GitHub Actions workflow
- Use remote state in S3 with DynamoDB locking

---

## CI/CD: Monitoring — add Prometheus metrics and Grafana dashboard

**Description:**
There is no observability into the running application.

**Tasks:**
- Install `@willsoto/nestjs-prometheus` in the backend
- Expose `GET /metrics` endpoint (Prometheus format)
- Add custom metrics: `http_requests_total`, `credential_issued_total`, `bst_minted_total`, `stellar_rpc_latency_seconds`
- Add `docker-compose.monitoring.yml` with Prometheus + Grafana services
- Import a pre-built Grafana dashboard JSON for NestJS metrics
- Document setup in `docs/monitoring.md`

---

## CI/CD: Monitoring — integrate Sentry for error tracking

**Description:**
Runtime errors in production are invisible.

**Tasks:**
- Install `@sentry/nestjs` in the backend and `@sentry/nextjs` in the frontend
- Configure DSN via `SENTRY_DSN` env var
- Capture unhandled exceptions and promise rejections
- Add release tracking tied to git commit SHA
- Add `SENTRY_DSN` to `.env.example`
- Set up Sentry alerts for new error types

---

## CI/CD: Secrets — migrate to GitHub Actions OIDC for AWS credentials

**Description:**
Long-lived AWS access keys stored as GitHub secrets are a security risk.

**Tasks:**
- Configure AWS IAM OIDC identity provider for GitHub Actions
- Create IAM role with least-privilege policy for deployment
- Update deployment workflows to use `aws-actions/configure-aws-credentials` with OIDC
- Remove static `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` secrets
- Document OIDC setup in `docs/aws-oidc.md`

---

## CI/CD: Release — add semantic versioning and changelog generation

**Description:**
There is no versioning or changelog process.

**Tasks:**
- Add `release-please` GitHub Action for automated semantic versioning
- Configure conventional commits enforcement via `commitlint` + `husky` pre-commit hook
- Auto-generate `CHANGELOG.md` on each release
- Bump `package.json` versions in both apps on release
- Tag Docker images with the semantic version

---

## Docs: API — publish interactive API docs to a public URL

**Description:**
Swagger is only available locally. External developers need access to API docs.

**Tasks:**
- Export `openapi.json` during the build step
- Host Swagger UI as a static site on GitHub Pages or Vercel
- Add a link to the hosted docs in `README.md`
- Add API versioning prefix (`/v1/`) to all routes
- Document authentication flow with examples in Swagger

---

## Docs: Architecture — add architecture decision records (ADRs)

**Description:**
There is no documentation of why key technical decisions were made.

**Tasks:**
- Create `docs/adr/` directory
- Write ADR-001: Why Stellar/Soroban over Ethereum
- Write ADR-002: Why NestJS over Express
- Write ADR-003: Why Next.js App Router
- Write ADR-004: Why Soroban persistent storage for credentials
- Use the MADR template format

---

## Docs: Onboarding — write comprehensive developer setup guide

**Description:**
The README quick-start is minimal and skips many setup steps.

**Tasks:**
- Write `docs/development-setup.md` covering: prerequisites, env var setup, database setup, Redis setup, Stellar testnet account funding, contract deployment, running all services
- Add troubleshooting section for common errors
- Add a `Makefile` with targets: `make setup`, `make dev`, `make test`, `make build`
- Add a `scripts/setup.sh` that automates the full local setup

---

## Docs: Smart Contracts — write contract interaction guide

**Description:**
There is no documentation on how to interact with the deployed contracts.

**Tasks:**
- Write `docs/contracts.md` covering: contract addresses (testnet/mainnet), function signatures, example `stellar-cli` invocations for each function
- Document event schemas for all emitted events
- Add a JavaScript/TypeScript code example for calling each contract from the backend
- Document the credential issuance flow end-to-end

---

## Docs: Contributing — write CONTRIBUTING.md

**Description:**
There are no contribution guidelines.

**Tasks:**
- Write `CONTRIBUTING.md` covering: code of conduct, branch naming conventions, commit message format (conventional commits), PR process, review checklist
- Add `CODE_OF_CONDUCT.md` (Contributor Covenant)
- Add issue templates for bug reports and feature requests in `.github/ISSUE_TEMPLATE/`
- Add `SECURITY.md` with responsible disclosure policy

---

## Security: Backend — add input sanitisation against XSS and SQL injection

**Description:**
User-supplied strings are stored and returned without sanitisation.

**Tasks:**
- Install `class-sanitizer` and add `@Sanitize()` decorators to all DTO string fields
- Strip HTML tags from `bio`, `title`, `description` fields before saving
- Ensure TypeORM parameterised queries are used everywhere (no raw query string interpolation)
- Add a test that submits `<script>alert(1)</script>` and asserts it is stripped

---

## Security: Backend — implement API key authentication for service-to-service calls

**Description:**
Internal service calls (e.g., contract event webhooks) need a separate auth mechanism from user JWTs.

**Tasks:**
- Add `ApiKeyStrategy` using `passport-headerapikey`
- Store hashed API keys in the database linked to a service account
- Protect internal endpoints (e.g., `POST /credentials/issue`) with API key auth
- Add `POST /admin/api-keys` to generate new API keys (Admin only)
- Rotate API keys without downtime

---

## Security: Contracts — add overflow protection to Token arithmetic

**Description:**
Soroban uses `i128` for token amounts. Unchecked arithmetic can overflow.

**Tasks:**
- Replace all `+` and `-` operations on balances with `checked_add` / `checked_sub`
- Panic with `"arithmetic overflow"` on overflow
- Add a maximum supply cap: `MAX_SUPPLY = 1_000_000_000 * 10_000_000` (1 billion BST with 7 decimals)
- Assert `total_supply + amount <= MAX_SUPPLY` in `mint`
- Write tests for overflow and max supply boundary conditions

---

## Security: Frontend — add Content Security Policy headers

**Description:**
No CSP headers are set, leaving the frontend vulnerable to XSS.

**Tasks:**
- Add CSP headers in `next.config.js` via `headers()` config
- Allow: `self`, trusted CDN domains, Stellar SDK scripts
- Block: `unsafe-inline` scripts (use nonces for inline scripts)
- Add `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin`
- Test with Mozilla Observatory and target grade A

---

## Security: Auth — add multi-factor authentication (TOTP)

**Description:**
High-value accounts (instructors, admins) should support MFA.

**Tasks:**
- Install `otplib` and `qrcode`
- Add `POST /auth/mfa/enable` — generates TOTP secret, returns QR code
- Add `POST /auth/mfa/verify` — verifies TOTP code and marks MFA as enabled on user
- Add `POST /auth/mfa/disable` — requires current TOTP code
- Require TOTP code on login if MFA is enabled (add `mfa_token` field to login DTO)
- Store encrypted TOTP secret in the database

---

## Stellar: Wallet — add Freighter wallet signing for credential verification

**Description:**
Credentials are issued to a Stellar public key but users cannot sign transactions from the frontend to prove ownership.

**Tasks:**
- Use `@stellar/freighter-api` to request the user to sign a challenge message
- Backend generates a challenge: `POST /auth/stellar-challenge` returns a random nonce
- Frontend signs the nonce with Freighter: `signMessage(nonce)`
- Backend verifies the signature: `POST /auth/stellar-verify` — links the public key to the user account
- This replaces the manual `stellarPublicKey` input in the profile page

---

## Stellar: Testnet — add testnet account funding helper

**Description:**
New developers need funded testnet accounts to test credential issuance.

**Tasks:**
- Add `POST /stellar/fund-testnet` endpoint (only available when `STELLAR_NETWORK=testnet`) that calls the Friendbot API to fund a given public key
- Add a "Fund Testnet Account" button to the profile page wallet section
- Add a `scripts/fund-testnet.sh` script that funds the `STELLAR_SECRET_KEY` account
- Document testnet setup in `docs/development-setup.md`

---

## Stellar: Events — add Soroban event indexer service

**Description:**
The backend has no way to react to on-chain events (e.g., progress recorded, credential issued) without polling.

**Tasks:**
- Create `apps/backend/src/stellar/stellar-indexer.service.ts`
- Use Soroban RPC `getEvents` to poll for contract events every 5 seconds
- On `analytics:completed` event, trigger credential issuance and notification
- On `token:transfer` event, update user's cached BST balance
- Store last processed ledger sequence in Redis to avoid reprocessing
- Add `INDEXER_POLL_INTERVAL_MS` env var

---

## Stellar: SEP-0010 — implement Stellar Web Authentication

**Description:**
SEP-0010 is the standard for authenticating Stellar accounts. Implementing it makes Brain-Storm compatible with the broader Stellar ecosystem.

**Tasks:**
- Implement `GET /auth/stellar` — returns a SEP-0010 challenge transaction
- Implement `POST /auth/stellar` — verifies the signed challenge and returns a JWT
- Use `@stellar/stellar-sdk` `Utils.buildChallengeTx` and `Utils.readChallengeTx`
- Add `STELLAR_WEB_AUTH_DOMAIN` env var
- Document SEP-0010 flow in `docs/stellar-auth.md`

---

## Stellar: SEP-0012 — add KYC integration for credential issuance

**Description:**
For regulated vocational credentials, KYC may be required before issuance.

**Tasks:**
- Implement SEP-0012 KYC flow: `GET /kyc/status/:stellarPublicKey`, `PUT /kyc/customer`
- Integrate with a KYC provider (e.g., Synaps or Persona) via webhook
- Gate credential issuance behind `kycStatus === 'approved'` check
- Add `KYC_PROVIDER_API_KEY` env var
- Make KYC requirement configurable per course via a `requiresKyc: boolean` field on `Course`

---

## Feature: Reviews — add course rating and review system

**Description:**
Students should be able to rate and review courses after completion.

**Tasks:**
- Create `Review` entity: `id`, `userId`, `courseId`, `rating` (1-5), `comment`, `createdAt`
- Unique constraint on `(userId, courseId)`
- Only enrolled students who have completed the course can review
- `POST /courses/:id/reviews`, `GET /courses/:id/reviews` (paginated)
- Add average rating to `GET /courses` response
- Display star rating and reviews on the Course Detail page

---

## Feature: Forums — add course discussion forum

**Description:**
StrellerMinds has a community discussion feature. Brain-Storm needs a per-course Q&A forum.

**Tasks:**
- Create `Post` entity: `id`, `courseId`, `userId`, `title`, `body`, `createdAt`, `updatedAt`
- Create `Reply` entity: `id`, `postId`, `userId`, `body`, `createdAt`
- `GET /courses/:id/posts`, `POST /courses/:id/posts`, `POST /posts/:id/replies`
- Instructors can pin posts and mark replies as answers
- Add forum section to Course Detail page
- Add notification when someone replies to your post

---

## Feature: Certificates — generate PDF certificates

**Description:**
Credentials are on-chain but users also want a downloadable PDF certificate.

**Tasks:**
- Install `puppeteer` or `@react-pdf/renderer` in the backend
- Create a certificate HTML template with Brain-Storm branding, student name, course name, date, and QR code linking to the on-chain verification URL
- Add `GET /credentials/:id/pdf` endpoint that generates and streams the PDF
- Add "Download Certificate" button to the credentials page
- Store generated PDFs in S3 and cache the URL

---

## Feature: Leaderboard — add BST token leaderboard

**Description:**
A leaderboard gamifies learning and encourages engagement.

**Tasks:**
- Add `GET /leaderboard` endpoint returning top 50 users by BST balance
- Cache leaderboard for 5 minutes in Redis
- Create `app/leaderboard/page.tsx` displaying rank, avatar, username, BST balance
- Highlight the current user's rank even if outside top 50
- Update leaderboard in real time via Server-Sent Events or polling

---

## Feature: Referrals — add referral programme

**Description:**
Users who refer new students should earn BST tokens.

**Tasks:**
- Add `referralCode: string` (unique, auto-generated) to `User` entity
- Add `referredBy: string` (nullable FK to User) to `User` entity
- On registration with a valid `?ref=CODE`, set `referredBy`
- When the referred user completes their first course, mint 50 BST to the referrer via the Token contract
- Add `GET /users/:id/referrals` endpoint showing referral count and earned BST
- Add referral link sharing UI to the profile page

---

## Feature: Notifications — add real-time notifications via WebSockets

**Description:**
Notifications are currently only available by polling `GET /notifications`. Real-time delivery improves UX.

**Tasks:**
- Install `@nestjs/websockets` and `socket.io`
- Create `NotificationsGateway` that authenticates connections via JWT
- Emit `notification` events to the user's socket room when a new notification is created
- Connect from the frontend using `socket.io-client`
- Show a notification bell in the Navbar with an unread count badge that updates in real time

---

## Feature: Search — add global full-text search

**Description:**
There is no global search across courses, users, and credentials.

**Tasks:**
- Add `GET /search?q=...&type=courses|users|credentials` endpoint
- Use PostgreSQL `tsvector` full-text search for courses and users
- Return results grouped by type with relevance scores
- Add a search bar to the Navbar that opens a search modal
- Debounce search input (300ms) and show results as the user types

---

## Feature: Analytics — add instructor analytics dashboard

**Description:**
Instructors have no visibility into how students are engaging with their courses.

**Tasks:**
- Add `GET /instructor/analytics` endpoint returning: total enrollments, completion rate, average progress, revenue (BST earned), top lessons by completion
- Aggregate data from `Progress` and `Enrollment` entities
- Create `app/instructor/analytics/page.tsx` with charts using `recharts`
- Show per-course breakdown
- Cache analytics for 10 minutes

---

## Feature: Offline — add PWA support for offline lesson viewing

**Description:**
Students in low-connectivity environments need offline access to lesson content.

**Tasks:**
- Add `next-pwa` to the frontend
- Configure service worker to cache lesson content pages and assets
- Add `manifest.json` with Brain-Storm branding
- Allow students to "save for offline" individual lessons
- Show offline indicator in the Navbar when the user is disconnected

---

## Feature: Mobile — add React Native mobile app scaffold

**Description:**
A mobile app extends the platform's reach significantly.

**Tasks:**
- Create `apps/mobile/` using Expo (React Native)
- Implement: splash screen, login, course list, course detail, lesson viewer, credentials gallery
- Share API client and TypeScript types with the frontend via a `packages/shared` workspace package
- Add `dev:mobile` script to root `package.json`
- Add mobile build to CI using Expo EAS

---

## Infra: Database — add read replica support for heavy read queries

**Description:**
All database queries go to a single PostgreSQL instance. Read-heavy endpoints (course list, leaderboard) should use a read replica.

**Tasks:**
- Configure TypeORM `replication` option with `master` and `slaves` connection pools
- Route `findAll`, `findOne` queries to the replica
- Route `save`, `update`, `delete` to the master
- Add `DATABASE_REPLICA_HOST` env var
- Document replica setup in `docs/database.md`

---

## Infra: Queue — add Bull job queue for async tasks

**Description:**
Credential issuance and email sending are done synchronously in the request cycle, causing slow responses.

**Tasks:**
- Install `@nestjs/bull` and `bull`
- Create `CredentialQueue` for async credential issuance
- Create `EmailQueue` for async email sending
- Move `StellarService.issueCredential` and all Nodemailer calls into queue processors
- Add Bull Board UI at `/admin/queues` for monitoring job status
- Add `REDIS_URL` (already in env) for Bull's Redis backend

---

## Infra: CDN — add static asset CDN configuration

**Description:**
Static assets (images, fonts, JS bundles) are served directly from the Next.js server.

**Tasks:**
- Configure `next.config.js` `assetPrefix` to point to a CloudFront or Cloudflare CDN URL
- Upload `public/` assets to S3 as part of the deployment pipeline
- Add cache-control headers: `max-age=31536000, immutable` for hashed assets
- Add `CDN_URL` env var
- Measure and document bundle size before/after

---

## Infra: Scalability — add horizontal scaling support

**Description:**
The backend is not designed for horizontal scaling (session state, in-memory caches).

**Tasks:**
- Ensure all session/cache state is stored in Redis (not in-memory)
- Replace any `Map` or module-level variables used as caches with Redis
- Add `INSTANCE_ID` env var for log correlation in multi-instance deployments
- Configure Bull queues to use Redis so jobs are shared across instances
- Add a `docker-compose.scale.yml` demonstrating 3 backend replicas behind an Nginx load balancer
- Write a load test that validates correct behaviour under horizontal scaling

---

## Infra: Backup — add automated database backup and restore procedure

**Description:**
There is no database backup strategy.

**Tasks:**
- Add a `scripts/backup.sh` that runs `pg_dump` and uploads the compressed dump to S3 with a timestamped key
- Add a `scripts/restore.sh` that downloads a dump from S3 and restores it
- Schedule daily backups via a cron job (or AWS EventBridge + Lambda)
- Test restore procedure and document RTO/RPO targets in `docs/disaster-recovery.md`
- Add backup success/failure alerting via email or Slack


*End of Brain-Storm GitHub Issues Backlog — 120 issues total.*
