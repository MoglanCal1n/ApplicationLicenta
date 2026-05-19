FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose Vite's default port
EXPOSE 5173

# Start the dev server and expose it on the local network
CMD ["npm", "run", "dev", "--", "--host"]
