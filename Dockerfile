# Doc Assistant — multi-stage build (npm workspaces).
#   API image (default target):  docker build -t doc-api .
#   Web image (nginx-served):    docker build --target web -t doc-web .

# ---------- Build stage: full deps + compile both apps ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci
COPY . .
RUN npm run build -w doc-api && npm run build -w doc-web

# ---------- API final image (default target) ----------
FROM node:22-alpine AS api
WORKDIR /app
ENV NODE_ENV=production PORT=3001
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci --omit=dev
COPY --from=build /app/apps/api/dist apps/api/dist
EXPOSE 3001
# --env-file-if-exists: works with a mounted .env or with compose-injected env vars.
CMD ["node", "--env-file-if-exists=.env", "apps/api/dist/main.js"]

# ---------- Web final image: nginx serves the built SPA and proxies /api ----------
FROM nginx:alpine AS web
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
# Proxy API calls to the `api` compose service; SPA fallback for client routes.
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  index index.html;\n  location /api/ { proxy_pass http://api:3001/api/; }\n  location / { try_files $uri /index.html; }\n}\n' \
  > /etc/nginx/conf.d/default.conf
EXPOSE 80
