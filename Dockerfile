# Container for Google Cloud Run and for Render when Language is Docker.
# Builds the game, then serves dist/ with nginx on $PORT (Cloud Run 8080, Render 10000).
#   gcloud run deploy court-sq-bound --source . --region us-central1 --allow-unauthenticated

# 1) Build the static site
FROM node:22-slim AS build
WORKDIR /app
COPY package.json ./
# There's no package-lock.json (the repo uses bun.lock), so npm resolves from package.json.
# CI's "npm can install package.json" check keeps this working.
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# 2) Serve it
FROM nginx:1.27-alpine
# Cloud Run sends traffic to $PORT (8080 unless set). The nginx image fills ${PORT}
# into the template at startup.
ENV PORT=8080
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
