################################################################
# Stage 1: Transpile the API client
################################################################
ARG DENO_IMAGE_VERSION=alpine
FROM denoland/deno:${DENO_IMAGE_VERSION} AS transpile
WORKDIR /build/neolace-api/
COPY ./neolace-api/ /build/neolace-api/
RUN apk add --update nodejs npm
RUN deno run --allow-read --allow-run --allow-write --allow-env _compile.ts
################################################################
# Stage 2: Intall our Next.js frontend
################################################################
FROM node:16-alpine
WORKDIR /neolace/frontend
ENV NODE_ENV production
ENV PATH /neolace/frontend/node_modules/.bin:$PATH

COPY ./frontend /neolace/frontend
COPY --from=transpile /build/neolace-api/ /neolace/neolace-api/

# Dependencies
RUN apk add --no-cache git
RUN npm ci --include=dev
# Compile locales
RUN npm run compile:i18n

# Pre-build Next.js app (transpile Typescript, save out some static pages, etc.)
RUN ./next-prebuild.sh

# Now install only runtime dependencies
RUN npm ci --omit=dev

# The frontend runs on port 5555
EXPOSE 5555

# Override the build-time environment variables with the current values, then start the server.
# This allows a single container image to be used for many different environments and configurations.
CMD ./next-rebuild.sh && npm run start
