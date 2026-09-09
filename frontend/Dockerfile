FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci

COPY frontend ./frontend

ARG VITE_API_BASE_URL=http://localhost:3000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build --workspace frontend

FROM nginx:1.27-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
