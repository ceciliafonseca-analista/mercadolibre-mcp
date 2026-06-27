FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["sh", "-c", "npx -y supergateway --stdio 'node dist/index.js' --port ${PORT:-8080}"]
