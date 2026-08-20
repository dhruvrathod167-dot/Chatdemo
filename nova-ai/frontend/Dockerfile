# Stage 1: Build React/Vite assets
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve compiled assets with Nginx
FROM nginx:alpine

# Copy custom nginx configuration for routing/proxies
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts to nginx public html folder
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
