FROM node:22-alpine

WORKDIR /app

# Copy package files first so Docker can reuse the dependency layer on later builds.
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci

COPY backend ./backend

# Prisma generates the client used by the compiled API before TypeScript is built.
RUN npm run prisma:generate --workspace backend \
  && npm run build --workspace backend

EXPOSE 3000

# Applying migrations and the idempotent seed on startup means a new laptop needs no manual database steps.
CMD ["sh", "-c", "npm exec --workspace backend -- prisma migrate deploy && npm exec --workspace backend -- prisma db seed && node backend/dist/src/server.js"]
