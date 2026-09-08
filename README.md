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
