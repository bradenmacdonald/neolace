ARG DENO_IMAGE_VERSION=alpine
FROM denoland/deno:${DENO_IMAGE_VERSION}
WORKDIR /neolace/backend
ENV DENO_DIR /neolace/deno_dir
ENV ENV_TYPE production
RUN mkdir /neolace/deno_dir

# This Dockerfile needs to be run from the root folder of "neolace-app", which contains the folders like "backend", "neolace-sdk", etc.
COPY backend /neolace/backend
COPY neolace-sdk /neolace/neolace-sdk

# Cache dependencies and check types
# Unfortunately the esm.sh server seems to serve files with some minor changes, so it's breaking the lock file checking, even with a pinned esm.sh version
RUN rm deno.lock
RUN deno cache neolace/rest-api/server.ts
RUN deno cache neolace/plugins/*/mod.ts

# The backend runs on port 5554
EXPOSE 5554

# Start the server
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "neolace/rest-api/server.ts"]
