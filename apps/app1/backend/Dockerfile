# Single stage is enough here — there's no build step, just install + copy.
FROM node:20-alpine

WORKDIR /app

# Pull latest security patches for the OS-layer openssl libs (same pattern
# as apps/landing's libexpat fix).
RUN apk update && apk upgrade libssl3 libcrypto3

# NOTE: no package-lock.json exists yet for this app, so this uses
# `npm install` for now. Once you've run the repo's "create-lockfile"
# workflow against apps/app1/backend, switch this to `npm ci` to match
# the other apps (reproducible, faster installs).
COPY package*.json ./
# Install our deps, then remove the npm CLI itself. We only ever run
# `node server.js` at runtime — npm's own vendored dependency tree
# (tar, glob, minimatch, pacote, sigstore, etc., bundled inside every
# node:*-alpine image) is what Trivy was flagging, not anything in our
# package.json.
RUN npm install --omit=dev \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY server.js ./

# Matches app1-backend's Deployment: runAsUser 101, containerPort 8080.
USER 101
EXPOSE 8080

CMD ["node", "server.js"]