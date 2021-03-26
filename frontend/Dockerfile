FROM node:14-alpine
WORKDIR /app
ENV NODE_ENV production
ENV PATH /app/node_modules/.bin:$PATH

COPY . /app/
# Because this dependency is referenced as a path, not as an npm package, we have to do some hacky stuff to get it
# to work.
COPY .build-temp/technotes-api/ /technotes-api/
RUN cd /technotes-api/ && npm install --also=dev && npm run build

# Dependencies
RUN apk add --no-cache git
RUN npm ci --also=dev

# The frontend runs on port 5555
EXPOSE 5555

# Build Next.js app (transpile Typescript, save out some static pages, etc.),
# then start the server. We don't build in advance (unfortunately) because
# it's necessary to specify the backend URL etc. during the build process, and
# that prevents the use of a single image for all environments (stage, prod)
CMD npm run build && npm run start
