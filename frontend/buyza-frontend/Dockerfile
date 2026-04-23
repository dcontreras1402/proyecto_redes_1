FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY . .
EXPOSE 5173
# Quitamos el -s para que respete las carpetas físicas
CMD ["serve", ".", "-l", "5173"]