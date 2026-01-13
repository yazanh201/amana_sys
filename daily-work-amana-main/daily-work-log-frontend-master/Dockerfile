# שלב 1: Build
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# שלב 2: Serve
FROM nginx:alpine

# מחיקת קבצי ברירת מחדל
RUN rm -rf /usr/share/nginx/html/*

# העתקת build
COPY --from=build /app/build /usr/share/nginx/html

# ⬅️ זה החלק שהיה חסר!
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Cloud Run עובד על 8080
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
