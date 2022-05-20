################################################################
# Stage 1: Transpile the API client
################################################################
ARG DENO_IMAGE_VERSION=alpine
FROM denoland/deno:${DENO_IMAGE_VERSION} AS transpile
WORKDIR /build/neolace-api/
COPY ./neolace-api/ /build/neolace-api/
RUN apk add --update nodejs npm
RUN deno run --allow-read --allow-run --allow-write --allow-env --no-check _compile.ts
################################################################
# Stage 2: Intall our Next.js frontend
################################################################
FROM node:16-alpine
WORKDIR /neolace/frontend
ENV NODE_ENV production
ENV PATH /neolace/frontend/node_modules/.bin:$PATH

COPY ./frontend /neolace/frontend
# Because this dependency is referenced as a path, not as an npm package, we have to do some hacky stuff to get it
# to work.
COPY --from=transpile /build/neolace-api/ /neolace/neolace-api/

# Dependencies
RUN apk add --no-cache git
RUN npm ci --also=dev
# Compile locales
RUN npm run compile:i18n

# The frontend runs on port 5555
EXPOSE 5555

# Build Next.js app (transpile Typescript, save out some static pages, etc.),
# then start the server. We don't build in advance (unfortunately) because
# it's necessary to specify the backend URL etc. during the build process, and
# that prevents the use of a single image for all environments (stage, prod)
CMD npm run build && npm run start
