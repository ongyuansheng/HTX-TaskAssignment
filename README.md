# HTX Task Assignment

## Database setup

Requirements: Node.js, npm, and Docker Desktop.

Install dependencies once:

```bash
npm install
```

Create your local backend environment file if it does not already exist:

```bash
cp backend/.env.example backend/.env
```

Start PostgreSQL:

```bash
docker compose up -d postgres
docker compose ps
```

Postgres should be healthy and expose `0.0.0.0:5432->5432/tcp`.

## Prisma workflow

After defining the models in `backend/prisma/schema.prisma`, create and apply the initial migration:

```bash
npm run prisma:validate --workspace backend
npm run prisma:migrate --workspace backend -- --name init
npm run prisma:generate --workspace backend
```

Seed the required developers and skills:

```bash
npm exec --workspace backend -- prisma db seed
```

The seed is safe to run more than once; it does not create duplicate records.

## Verify the database

Check that all migrations are applied:

```bash
npm exec --workspace backend -- prisma migrate status
```

Open Prisma Studio to inspect records and relationships:

```bash
npm run prisma:studio --workspace backend
```

Visit `http://localhost:5555`. The initial seed should contain four developers, two skills, and five developer-skill links.

## Troubleshooting

If Prisma reports `P1001: Can't reach database server at localhost:5432`, recreate the Postgres container to restore its port mapping:

```bash
docker compose up -d --force-recreate postgres
```

This recreates only the container; the named database volume is preserved.

## System design


```text
Client → Express routes → Task service → Prisma repository → PostgreSQL
```

- **Routes** validate HTTP input and return JSON responses.
- **Task service** contains the assignment rule: a developer must have every skill required by a task.
- **Prisma repository** performs the PostgreSQL queries, keeping database details out of the business-rule code.
- **PostgreSQL** stores developers, tasks, skills, and the two many-to-many relationships.

This separation keeps the important rule easy to test without using a real database.

## Backend API

Start the API:

```bash
npm run dev --workspace backend
```

The API runs at `http://localhost:3000`.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Health check |
| `POST` | `/tasks` | Create a task with required skill IDs |
| `GET` | `/tasks` | List tasks |
| `GET` | `/tasks/:id` | Read a task |
| `PATCH` | `/tasks/:id` | Update assignee and/or status |
| `GET` | `/developers` | List developers and skills |
| `GET` | `/developers/:id` | Read a developer and assigned tasks |
| `GET` | `/skills` | List skills |
| `GET` | `/skills/:id` | Read a skill and related records |

Create a task:

```json
{
  "title": "Build a responsive homepage",
  "requiredSkillIds": ["frontend-skill-uuid"],
  "status": "TODO"
}
```

Update an assignee and/or status:

```json
{
  "assignedDeveloperId": "developer-uuid",
  "status": "IN_PROGRESS"
}
```

The API returns `400 Bad Request` for invalid input, missing skills, or an incompatible assignment. It returns `404 Not Found` when a requested task, developer, or skill does not exist.

## Key libraries

| Library | Why it is used |
| --- | --- |
| Express | Small, familiar Node.js framework for the REST API. |
| Prisma + PostgreSQL driver | Type-safe database queries, migrations, and seeding for PostgreSQL. |
| Zod | Validates request bodies before database work is performed. |
| Docker Compose | Starts a repeatable local PostgreSQL database. |
| TypeScript + tsx | Type-safe backend code with a simple development runner. |
| Vitest + Supertest | Tests the task-assignment rule and Express health endpoint. |
| CORS | Allows the future frontend, running on another local port, to call the API. |
| Helmet | Adds standard HTTP security headers with minimal configuration. |

## Verification

```bash
npm run typecheck --workspace backend
npm test --workspace backend
```

The tests cover valid task assignment, rejected incompatible assignment, task-status changes, and the health endpoint.
