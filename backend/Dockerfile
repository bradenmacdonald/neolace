################################################################
# Stage 1: Transpile the typescript
################################################################
FROM node:16 as transpile
WORKDIR /build
ENV NODE_ENV production
ENV PATH /build/node_modules/.bin:$PATH

COPY . /build/

# OK, now install dependencies and transpile the TypeScript:
RUN npm ci --also=dev
RUN npm run transpile

################################################################
# Stage 2: Install only minimal dependencies to run the app
################################################################
FROM node:16-alpine
WORKDIR /app
ENV NODE_ENV production
ENV PATH /app/node_modules/.bin:$PATH

COPY --from=transpile /build/dist/ .
COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json

RUN apk add --no-cache git
RUN npm ci --only=production

# The backend runs on port 5554
EXPOSE 5554

# Start the server
CMD ["node", "server.js"]
