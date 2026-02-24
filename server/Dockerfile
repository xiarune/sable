FROM node:18-alpine

WORKDIR /app

# Install build dependencies for bcrypt native compilation
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose the server port
EXPOSE 5050

# Start the server
CMD ["npm", "start"]
