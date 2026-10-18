# --- Build stage ---
# Node 22+ and the pnpm version from root package.json "packageManager", so the
# lockfile this stage validates was written by the same pnpm that runs here.
FROM node:22-alpine3.20 AS build
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
RUN corepack prepare pnpm@11.7.0 --activate && pnpm install --no-frozen-lockfile

COPY . ./  
WORKDIR /app/apps/web

# Frontend must call the nginx /api proxy, not localhost:5000, when served
# from the Docker container. Use /api so Axios requests are relative and
# nginx proxies them to the backend container.
ENV VITE_API_URL=/api

RUN pnpm --filter web build

# --- Serve stage ---
FROM nginx:alpine3.20
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
