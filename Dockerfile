FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run seed
ENV NODE_ENV=production
ENV PORT=3000
# JWT_SECRET es OBLIGATORIO en producción. Pásalo al ejecutar el contenedor:
#   docker run -e JWT_SECRET="clave-aleatoria-de-32+-caracteres" ...
EXPOSE 3000
CMD ["node", "server.js"]
