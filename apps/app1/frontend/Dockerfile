# Single stage — this is a plain Node server serving static files,
# no Vite/React build step is needed.
FROM node:20-alpine

WORKDIR /app

# Pull latest security patches for the OS-layer openssl libs (same pattern
# as apps/landing's libexpat fix).
RUN apk update && apk upgrade libssl3 libcrypto3

COPY package*.json ./
# npm ci installs exactly what's pinned in package-lock.json — reproducible,
# and matches apps/landing's pattern. Then remove the npm CLI itself: we
# only ever run `node server.js` at runtime, and npm's own vendored
# dependency tree (tar, glob, minimatch, pacote, sigstore, etc., bundled
# inside every node:*-alpine image) is what Trivy was flagging, not
# anything in our package.json.
RUN npm ci --omit=dev \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY server.js ./
COPY public ./public

# Matches app1-frontend's Deployment: runAsUser 101, containerPort 8080.
USER 101
EXPOSE 8080

CMD ["node", "server.js"]