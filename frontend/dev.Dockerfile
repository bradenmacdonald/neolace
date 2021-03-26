FROM node:14

# Set the working directory to /app
WORKDIR /app

ENV NODE_ENV development
ENV PATH /app/node_modules/.bin:$PATH

# The frontend runs on port 5555
EXPOSE 5555

# Start the development server
CMD ["npm", "run", "entrypoint-dev"]
