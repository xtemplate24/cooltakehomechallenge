# Build stage — compiles the React app to static files
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage — Node serves the static files + a small API.
# Data lives in SQLite (built into Node 22, no extra packages) on a mounted volume.
FROM node:22-alpine
WORKDIR /app
RUN apk update && apk upgrade libssl3 libcrypto3 \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
COPY server.js ./
COPY --from=build /app/dist ./dist
USER 101
EXPOSE 8080
CMD ["node", "server.js"]
