FROM node:20-alpine

WORKDIR /app

# Install build dependencies for bcrypt native compilation
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose the server port
EXPOSE 5050

# Limit Node.js memory and start the server
CMD ["node", "--max-old-space-size=400", "src/server.js"]
