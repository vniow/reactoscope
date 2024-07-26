FROM node:alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# set the environment variable
ENV PORT=80

# Expose the port
EXPOSE 80

# start the application
CMD ["npm", "run", "preview"]
