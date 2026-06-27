FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 8000
CMD ["npx", "-y", "supergateway", "--stdio", "node dist/index.js", "--port", "8000"]
