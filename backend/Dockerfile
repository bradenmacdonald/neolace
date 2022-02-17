ARG DENO_IMAGE_VERSION=alpine
FROM denoland/deno:${DENO_IMAGE_VERSION}
WORKDIR /neolace/backend
ENV DENO_DIR /neolace/deno_dir
ENV ENV_TYPE production
RUN mkdir /neolace/deno_dir

# This Dockerfile needs to be run from the root folder of "neolace-app", which contains the folders like "backend", "neolace-api", etc.
COPY backend /neolace/backend
COPY neolace-api /neolace/neolace-api

# Cache dependencies and check types
RUN apk add git
RUN cd / && git clone https://github.com/neolace-dev/vertex-framework.git
RUN deno cache --import-map=import_map.json neolace/api/server.ts
RUN deno cache --import-map=import_map.json neolace/plugins/*/mod.ts

# The backend runs on port 5554
EXPOSE 5554

# Start the server
CMD ["deno", "run", "--no-check", "--import-map=import_map.json", "--allow-net", "--allow-env", "--allow-read", "neolace/api/server.ts"]
