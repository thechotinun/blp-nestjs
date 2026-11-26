# blp-nestjs

REST API built with [NestJS](https://nestjs.com) 12, TypeORM and PostgreSQL. It ships one sample feature, **Todo** (CRUD with soft delete and pagination), that shows the conventions to follow for new modules.

- Every route lives under `/api/v1`
- Responses use one envelope for success and errors, with stable error codes
- Unit tests sit next to the code; e2e tests live in `test/`

## Requirements

- Node.js 20.19+ or 22.12+ (the Nest 12 packages are ESM only)
- PostgreSQL
- npm

## Getting started

```bash
npm install
cp .env.example .env     # then fill in the values, see "Environment variables"
createdb <DATABASE_NAME> # the database must exist
npm run migration:run    # create the tables (or set DATABASE_SYNC=true in development, see below)
npm run start:dev
```

The app listens on `PORT` (3000 if unset). Quick check: `GET /api/v1` returns `Hello World!`.

## Scripts

| Script                                        | What it does                                                         |
| --------------------------------------------- | -------------------------------------------------------------------- |
| `npm run start` / `start:dev` / `start:debug` | Run the app (plain, watch mode, debug + watch)                       |
| `npm run build` then `npm run start:prod`     | Compile to `dist/` and run it                                        |
| `npm test`                                    | Unit tests                                                           |
| `npm run test:cov`                            | Unit tests with coverage (report in `coverage/`)                     |
| `npm run test:e2e`                            | e2e tests, needs a test database (see [Testing](#testing))           |
| `npm run lint`                                | ESLint with `--fix`                                                  |
| `npm run format`                              | Prettier on `src` and `test`                                         |
| `npm run migration:*`                         | Database migrations, see [Database migrations](#database-migrations) |

Run tests through the npm scripts. They pass `--experimental-vm-modules`, which Jest needs to load the ESM-only Nest packages; a bare `npx jest` fails with "Must use import to load ES Module".

## Environment variables

Copy `.env.example` to `.env` (git-ignored). Values already set in the shell or CI override the file.

| Variable                                                                                            | Default                 | Notes                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                                                                                              | `3000`                  | HTTP port                                                                                                                                                            |
| `APP_URL`                                                                                           | `http://localhost:3000` | Public base URL                                                                                                                                                      |
| `DATABASE_TYPE`                                                                                     | none                    | Use `postgres`                                                                                                                                                       |
| `DATABASE_HOST`                                                                                     | none                    |                                                                                                                                                                      |
| `DATABASE_PORT`                                                                                     | `5432`                  |                                                                                                                                                                      |
| `DATABASE_NAME`                                                                                     | none                    | Database used when running the app                                                                                                                                   |
| `DATABASE_USER` / `DATABASE_PASSWORD`                                                               | none                    |                                                                                                                                                                      |
| `DATABASE_SYNC`                                                                                     | `false`                 | `true` lets TypeORM create/alter tables from the entities. Convenient in development only, use [migrations](#database-migrations) on shared and production databases |
| `PER_PAGE`                                                                                          | `10`                    | Default page size of list endpoints (max 100 per request)                                                                                                            |
| `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRE` (`15m`), `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRE` (`1h`) |                         | Read by the config but not used by any code yet; reserved for authentication                                                                                         |
| `DATABASE_NAME_TEST`                                                                                | none                    | Test runs only, see [Testing](#testing)                                                                                                                              |

## Project structure

```
.
├── src
│   ├── main.ts                      # Bootstrap: create app, call configureApp(), listen
│   ├── app.setup.ts                 # configureApp(): CORS, ValidationPipe, prefix "api", URI version "v1"
│   │                                #   shared by main.ts and the e2e tests
│   ├── modules                      # One folder per feature
│   │   ├── app                      # Root module (AppModule) and the "Hello World" sample
│   │   │   ├── app.module.ts        #   ConfigModule, TypeORM, global exception filter, TodoModule
│   │   │   ├── controllers
│   │   │   └── services
│   │   └── todo                     # Sample feature
│   │       ├── todo.module.ts
│   │       ├── controllers          #   post.controller.ts holds TodoController (route /todos)
│   │       ├── services             #   business logic and error handling
│   │       ├── dto                  #   request bodies + validation rules (class-validator)
│   │       └── resources            #   response shapes: which fields reach the client
│   ├── entities                     # TypeORM entities (base-entity.ts, todo.entity.ts)
│   ├── repositories                 # TypeORM repositories (base.repository.ts, todo.repository.ts)
│   ├── migrations                   # TypeORM migrations, generated and run by the migration:* scripts
│   ├── commons                      # Code shared by all modules
│   │   ├── dto                      #   PaginateQuery (page, perPage)
│   │   ├── helpers                  #   paginate(): query + meta + links
│   │   ├── interfaces               #   Pagination types
│   │   ├── reponses                 #   ApiResource: success envelope, errors are rethrown
│   │   └── resources                #   base DTOs for responses
│   ├── exceptions                   # Error handling
│   │   ├── exception.filter.ts      #   global filter, builds the error envelope
│   │   ├── app                      #   ApiException and per-feature exceptions (TodoException)
│   │   ├── customs                  #   ValidationException, FlattenValidationErrors
│   │   └── constants                #   error codes and HTTP status messages
│   ├── interceptors                 # @UseResources(Dto): strips fields a DTO does not @Expose()
│   └── configs
│       ├── configuration.ts         #   typed config read from environment variables
│       └── typeorm                  #   TypeORM options for the app (default.ts) and for the CLI (data-source.ts)
├── test
│   ├── app.e2e-spec.ts              # e2e tests (real app + real test database)
│   └── jest-e2e.config.ts
├── .env.example                     # template for .env
├── .env.test.example                # template for .env.test.local
├── jest.config.ts                   # unit tests + coverage settings
└── tsconfig.json                    # also defines the path aliases below
```

`*.spec.ts` files are unit tests and sit next to the file they test.

### Path aliases

Defined in `tsconfig.json` and picked up automatically by Jest:

| Alias             | Folder               |
| ----------------- | -------------------- |
| `@config/*`       | `src/configs/*`      |
| `@modules/*`      | `src/modules/*`      |
| `@interceptors/*` | `src/interceptors/*` |
| `@repositories/*` | `src/repositories/*` |
| `@entities/*`     | `src/entities/*`     |
| `@commons/*`      | `src/commons/*`      |
| `@exceptions/*`   | `src/exceptions/*`   |
| `@/*`             | `src/*`              |

## Database migrations

Schema changes go through TypeORM migrations so every environment gets the same SQL in the same order. `DATABASE_SYNC=true` is only a shortcut for local development: it changes the schema silently and must stay off on shared and production databases.

The CLI reads `src/configs/typeorm/data-source.ts`. It loads `.env` itself (variables already set in the shell win), so `DATABASE_NAME` decides which database it touches.

| Script                                                | What it does                                                                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `npm run migration:generate -- src/migrations/<Name>` | Compare the entities with the database and write the missing SQL as a migration                           |
| `npm run migration:create -- src/migrations/<Name>`   | Create an empty migration for hand-written SQL (data fixes and so on)                                     |
| `npm run migration:run`                               | Run pending migrations                                                                                    |
| `npm run migration:show`                              | List migrations (`[X]` = already run)                                                                     |
| `npm run migration:revert`                            | Undo the last migration                                                                                   |
| `npm run migration:run:prod`                          | Run pending migrations from the compiled `dist/` (after `npm run build`, no ts-node needed on the server) |

Workflow for a schema change:

1. Change the entity
2. `npm run migration:generate -- src/migrations/AddSomething`
3. Open the generated file and check both `up` and `down`, then `npm run format`
4. `npm run migration:run` locally, and commit the migration together with the entity change
5. Deploy: build, then `npm run migration:run:prod` before starting the new version

Rules of thumb:

- Never edit a migration that has been committed and run anywhere; add a new one instead
- Review the generated SQL. A renamed column is generated as drop + add, which loses data
- Run migrations as their own deploy step rather than at app start, so several instances do not race
- The CLI runs `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` on every connection (TypeORM does this for uuid columns), so the database user needs that privilege or the extension must be installed up front
- `npm run migration:generate -- src/migrations/X --check` exits with 1 when the database and the entities differ, handy as a CI check

### Existing database created with `DATABASE_SYNC=true`

`src/migrations/*-InitSchema.ts` creates the whole current schema. On a database that already has these tables do not run it for real; record it as done instead:

```bash
npm run migration:run -- --fake
```

The baseline was checked against a database built by `synchronize`: `migration:generate` reports no differences. If your database is older than the partial unique index on `todos.name` (see the entity), it still has the old table-wide unique constraint, so fix that by hand first or recreate the database.

## API

Base path: `/api/v1`

| Method   | Path         | Success | Notes                                                                                      |
| -------- | ------------ | ------- | ------------------------------------------------------------------------------------------ |
| `GET`    | `/`          | 200     | `Hello World!`                                                                             |
| `POST`   | `/todos`     | 201     | Body: `name` (required, max 50), `description` (optional)                                  |
| `GET`    | `/todos`     | 200     | Query: `page` (default 1), `perPage` (default `PER_PAGE`, max 100), `name` (partial match) |
| `GET`    | `/todos/:id` | 200     |                                                                                            |
| `PATCH`  | `/todos/:id` | 200     | Same body as create (`name` is required)                                                   |
| `DELETE` | `/todos/:id` | 200     | Soft delete                                                                                |

Todo names are unique among active todos, so a soft-deleted todo does not block reusing its name.

### Response format

Success. `data` is omitted when there is nothing to return; `meta` and `links` appear on lists:

```json
{
	"data": { "id": "…", "name": "buy milk" },
	"status": { "code": 200, "message": "OK" }
}
```

Error. `status.code` is the HTTP status and `error.code` is an application code:

```json
{
	"status": { "code": 404, "message": "Not Found" },
	"error": { "code": 100101, "message": "TODO_NOT_FOUND", "errors": [] }
}
```

Validation errors list messages in `errors`, keyed by field.

| Error code | Name                | HTTP                                      |
| ---------- | ------------------- | ----------------------------------------- |
| `900403`   | `UNAUTHORIZED`      | 401 / 403                                 |
| `900422`   | `VALIDATE_ERROR`    | status of the exception (for example 400) |
| `100101`   | `TODO_NOT_FOUND`    | 404                                       |
| `100102`   | `TODO_DELETE_ERROR` | 422                                       |
| `100103`   | `TODO_CREATE_ERROR` | 422                                       |
| `100104`   | `TODO_UPDATE_ERROR` | 422                                       |
| `100105`   | `TODO_EXIST`        | 409                                       |
| `100106`   | `TODO_FIND_ERROR`   | 500                                       |

Unexpected errors are logged on the server and the client only gets the generic code above, so database messages are never sent out.

## Adding a feature

Follow the Todo module:

1. Entity in `src/entities` and repository in `src/repositories`
2. Module in `src/modules/<name>` with controller, service, `dto/` and `resources/`
3. Error codes in `src/exceptions/constants/error-codes.constant.ts` and an exception class in `src/exceptions/app` (copy `todo.exception.ts`)
4. Controllers wrap success with `ApiResource.successResponse(data, status)`; services throw `ApiException`s and let the global filter format them
5. Register the module in `AppModule`
6. Add `*.spec.ts` files next to the new code

## Testing

**Unit tests** (`npm test`, `npm run test:cov`) need no database. Repositories are mocked. Coverage ignores `*.module.ts`, `main.ts`, `app.setup.ts` and `index.ts` barrels, which only wire things together and are exercised by the e2e tests.

**e2e tests** (`npm run test:e2e`) start the real app and connect to PostgreSQL, so they need a separate test database:

```bash
cp .env.test.example .env.test.local   # git-ignored, fill in the values
createdb <DATABASE_NAME_TEST>
npm run test:e2e
```

- Jest sets `NODE_ENV=test`. In that mode `.env.test.local` is read first, then `.env.test` if it exists (the first file wins for a variable that is in both); `.env` is not read. `DATABASE_NAME_TEST` is used as the database name
- The run stops immediately if `DATABASE_NAME_TEST` is missing, so tests can never fall back to a default database while `DATABASE_SYNC` is on
- Use a database name different from `DATABASE_NAME`

## Code style

Prettier (tabs, single quotes) and ESLint with `typescript-eslint`; run `npm run format` and `npm run lint` before committing. The git hooks below also run them on the files you commit.

## Git hooks and commit messages

[husky](https://typicode.github.io/husky) runs these hooks (defined in `.husky/`):

| Hook         | Runs                          | Purpose                                                                                   |
| ------------ | ----------------------------- | ----------------------------------------------------------------------------------------- |
| `pre-commit` | `lint-staged`                 | ESLint `--fix` and Prettier on the staged `.ts` files, Prettier on staged `.json` / `.md` |
| `commit-msg` | `commitlint`                  | Rejects messages that do not follow the format below                                      |
| `pre-push`   | `tsc --noEmit` and `npm test` | Stops a push that does not type-check or has failing unit tests                           |

The hooks are installed by `npm install` (the `prepare` script runs `husky`). If a commit does not trigger them, check `git config core.hooksPath`; it should print `.husky/_`, and `npm run prepare` sets it.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org) (rules in `commitlint.config.ts`):

```
<type>(<optional scope>): <subject>

<optional body>
```

- Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- The first line is at most 100 characters and the subject is not all upper-case
- Examples: `feat(todo): add soft delete`, `fix: return 404 when the todo is missing`

Use `git commit --no-verify` or `git push --no-verify` only in an emergency; the same checks should run in CI.

## Resources

- [NestJS documentation](https://docs.nestjs.com)
- [NestJS Observe](https://observe.nestjs.com) for production traces, errors and metrics (`npx @nestjs/observe link` sets it up)
