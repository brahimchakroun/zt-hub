FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist/zt-hub /tmp/dist
RUN if [ -d /tmp/dist/browser ]; then cp -r /tmp/dist/browser/. /usr/share/nginx/html/; else cp -r /tmp/dist/. /usr/share/nginx/html/; fi
