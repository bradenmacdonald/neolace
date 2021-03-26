FROM node:14

# Set the working directory to /app
WORKDIR /app

ENV NODE_ENV development
ENV PATH /app/node_modules/.bin:$PATH

# The backend runs on port 5554 and the node debugger on 5553
EXPOSE 5554 5553

# Start the development server
CMD ["npm", "run", "entrypoint-dev"]
