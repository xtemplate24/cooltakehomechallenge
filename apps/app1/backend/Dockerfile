# Single stage is enough here — there's no build step, just install + copy.
FROM node:20-alpine

WORKDIR /app

# NOTE: no package-lock.json exists yet for this app, so this uses
# `npm install` for now. Once you've run the repo's "create-lockfile"
# workflow against apps/app1/backend, switch this to `npm ci` to match
# the other apps (reproducible, faster installs).
COPY package*.json ./
RUN npm install --omit=dev

COPY server.js ./

# Matches app1-backend's Deployment: runAsUser 101, containerPort 8080.
USER 101
EXPOSE 8080

CMD ["node", "server.js"]
