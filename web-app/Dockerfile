FROM node:14-alpine3.13 as builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
ARG dev
RUN if [[ -z "dev" ]] ; then echo npm run build --prod ; else npm run build ; fi

FROM nginx:1.20.1-alpine
COPY nginx.conf /etc/nginx/
COPY --from=builder /usr/src/app/dist/biomedical-image-annotation-web-app/ /usr/share/nginx/html
