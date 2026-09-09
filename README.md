# HTX Task Assignment

## Run the full application with Docker

The only requirement is [Docker Desktop](https://www.docker.com/products/docker-desktop/). Node.js, npm, PostgreSQL, migrations, the seed data, and the frontend build are all handled by Docker Compose.

From the repository root, run:

```bash
docker compose up --build
```

Then open `http://localhost:5173`.

| Service    | Address                   | What it does                                      |
| ---------- | ------------------------- | ------------------------------------------------- |
| Frontend   | `http://localhost:5173` | React application, served by Nginx.               |
| Backend    | `http://localhost:3000` | Express API.`GET /health` confirms it is ready. |
| PostgreSQL | `localhost:5432`        | Persistent database used by the backend.          |

The backend waits for PostgreSQL to become healthy, applies all committed Prisma migrations, and runs the safe-to-repeat seed automatically. The initial data includes Alice, Bob, Carol, Dave, Frontend, and Backend.

To enable automatic LLM skill identification, add your Gemini key to `backend/.env` before starting Docker Compose:

```bash
cp backend/.env.example backend/.env
```

Then edit `backend/.env` and set `GEMINI_API_KEY=your_api_key`.

The application still starts without the key. Tasks with user-selected skills work normally; creating a task with no skills returns a clear configuration error until a key is provided.

Stop the stack with:

```bash
docker compose down
```

The PostgreSQL named volume is preserved. To remove all local database data as well, run `docker compose down -v`.

View backend logs, including task creation and Gemini skill-identification events:

```bash
docker compose logs -f backend
```

## Local development without Docker

Requirements: Node.js, npm, and Docker Desktop.

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up -d postgres
```

Start the API and frontend in separate terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

For a local backend, add `GEMINI_API_KEY` to `backend/.env` if you want automatic skill identification.

## Prisma workflow

Validate the schema, apply a new migration during development, and regenerate the client:

```bash
npm run prisma:validate --workspace backend
npm run prisma:migrate --workspace backend -- --name describe-your-change
npm run prisma:generate --workspace backend
```

The seed is safe to run more than once:

```bash
npm exec --workspace backend -- prisma db seed
```

The task hierarchy migration adds a nullable `parentTaskId` column. Existing tasks need no backfill: they remain root tasks because their parent ID is `null`.

## Verify the database

```bash
npm exec --workspace backend -- prisma migrate status
npm run prisma:studio --workspace backend
```

Prisma Studio is available at `http://localhost:5555` while it is running.

## System design

```text
Browser → Nginx → React client → Express routes → Task service → Prisma repository → PostgreSQL
                                                └→ Gemini API (only for tasks without skills)
```

- **React client** displays tasks, creates tasks, and sends assignment/status changes to the API.
- **Routes** validate HTTP input, identify missing task skills with Gemini, and return JSON responses.
- **Task service** contains the assignment rule: a developer must have every skill required by a task.
- **Prisma repository** performs the PostgreSQL queries, keeping database details out of the business-rule code.
- **PostgreSQL** stores developers, tasks, skills, the two many-to-many relationships, and the task/subtask hierarchy.
- **Docker Compose** runs the three application services together and connects them on a private Docker network.

The LLM integration sits behind a small `SkillClassifier` interface. Tests use a fake classifier instead of calling Gemini, so they remain reliable and do not need an API key.

## Backend API

Start the API:

```bash
npm run dev --workspace backend
```

The API runs at `http://localhost:3000`.

| Method    | Route               | Purpose                                    |
| --------- | ------------------- | ------------------------------------------ |
| `GET`   | `/health`         | Health check                               |
| `POST`  | `/tasks`          | Create a task and nested subtasks          |
| `GET`   | `/tasks`          | List root tasks with their nested subtasks |
| `GET`   | `/tasks/:id`      | Read a task                                |
| `PATCH` | `/tasks/:id`      | Update assignee and/or status              |
| `GET`   | `/developers`     | List developers and skills                 |
| `GET`   | `/developers/:id` | Read a developer and assigned tasks        |
| `GET`   | `/skills`         | List skills                                |
| `GET`   | `/skills/:id`     | Read a skill and related records           |

Create a task:

```json
{
  "title": "Build a responsive homepage",
  "requiredSkillIds": ["frontend-skill-uuid"],
  "status": "TODO",
  "subtasks": [
    {
      "title": "Build the navigation component",
      "requiredSkillIds": ["frontend-skill-uuid"],
      "subtasks": []
    }
  ]
}
```

`requiredSkillIds` is optional for every task and subtask. When it is empty, the backend asks Gemini to identify `Frontend`, `Backend`, or both from the title before saving the task tree. User-selected skills are preserved and are not sent to Gemini.

Update an assignee and/or status:

```json
{
  "assignedDeveloperId": "developer-uuid",
  "status": "IN_PROGRESS"
}
```

The API returns `400 Bad Request` for invalid input, missing skills, an incompatible assignment, or creating or updating a task as `DONE` before all of its direct subtasks are `DONE`. It returns `502 Bad Gateway` if Gemini cannot identify skills, and does not create the task. Reopening a subtask automatically changes any completed parent tasks to `IN_PROGRESS`. It returns `404 Not Found` when a requested task, developer, or skill does not exist.

## Frontend

Start the backend and frontend in separate terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

Open `http://localhost:5173`. The Task List page follows the provided wireframe: it lists each task's title and skills, with nested subtasks indented below their parent. It has inline dropdowns for status and assignee. Only developers with every required skill are offered in the assignee dropdown. The Create Task page lets users add subtasks at any level, choose skills for each one, or leave skills empty for automatic identification.

## Gemini setup

Create an API key in [Google AI Studio](https://aistudio.google.com/app/apikey), then add it to your uncommitted `backend/.env` file:

```text
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-3.6-flash
```

`gemini-3.6-flash` is the configured default, but the model is environment-based so it can be changed without code changes. The key is used only by the backend and must never be added to the repository or exposed to the frontend.

## Key libraries

| Library                           | Why it is used                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| Express                           | Small, familiar Node.js framework for the REST API.                                              |
| Prisma + PostgreSQL driver        | Type-safe database queries, migrations, and seeding for PostgreSQL.                              |
| Zod                               | Validates request bodies before database work is performed.                                      |
| Docker Compose                    | Starts a repeatable local PostgreSQL database.                                                   |
| TypeScript + tsx                  | Type-safe backend code with a simple development runner.                                         |
| Vitest + Supertest                | Tests the task-assignment rule and Express health endpoint.                                      |
| React Testing Library             | Tests frontend behaviour such as form submission and assignment choices without testing styling. |
| React + Vite                      | A small TypeScript single-page application with a fast development server and build process.     |
| TanStack Query                    | Fetches tasks, developers, and skills, and refreshes task data after changes.                    |
| Zod                               | Validates the recursive task payload before the create form sends it.                            |
| Tailwind CSS                      | Provides the small, responsive visual layer without adding a component library.                  |
| CORS                              | Allows the future frontend, running on another local port, to call the API.                      |
| Helmet                            | Adds standard HTTP security headers with minimal configuration.                                  |
| Native`fetch` + Gemini REST API | Calls Gemini without another backend SDK; the response is validated before it is used.           |

## Verification

```bash
npm run typecheck --workspace backend
npm test --workspace backend
npm test --workspace frontend
npm run build --workspace frontend
```

The backend tests cover valid task assignment, status rules, LLM skill identification with a fake classifier, Gemini response validation, and failure handling. The frontend tests cover compatible assignee choices, status updates, title validation, and flat/nested task creation requests, including submitting a task without skills for backend identification.
