FROM node:14 as builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.20.0
COPY nginx.conf /etc/nginx/
COPY --from=builder /usr/src/app/dist/biomedical-image-annotation-web-app/ /usr/share/nginx/html
