FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY . .
EXPOSE 5173
CMD ["serve", ".", "-l", "5173"]