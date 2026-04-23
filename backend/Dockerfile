# Use the official lightweight Node.js 18 image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all other backend source code
COPY . .

# Expose the port your Express server runs on
EXPOSE 5000

# Start the server (using nodemon for development, or node for prod)
CMD ["npm", "run", "dev"]
