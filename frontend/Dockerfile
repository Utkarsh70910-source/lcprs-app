# Use official Node.js image
FROM node:18-alpine

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

# Expose the React development port
EXPOSE 3000

# Start React app
CMD ["npm", "start"]
