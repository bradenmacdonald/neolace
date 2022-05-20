FROM node:16-alpine
WORKDIR /neolace/

# Install git and curl
RUN apk add git curl

# Install Deno:
RUN curl https://github.com/denoland/deno/releases/download/v1.22.0/deno-x86_64-unknown-linux-gnu.zip --output deno.zip --location
RUN unzip deno.zip
RUN mv deno /usr/local/bin/deno
RUN chmod +x /usr/local/bin/deno
RUN rm deno.zip
