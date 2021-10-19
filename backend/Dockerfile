FROM denoland/deno:alpine
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
RUN deno cache --import-map=import_map.json --lock=lock.json --lock-write --unstable neolace/api/server.ts

# The backend runs on port 5554
EXPOSE 5554

# Start the server
CMD ["deno", "run", "--lock=lock.json", "--cached-only", "--no-check", "--unstable", "--import-map=import_map.json", "--allow-net", "--allow-env", "neolace/api/server.ts"]
