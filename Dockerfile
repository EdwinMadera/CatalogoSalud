FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run seed
ENV PORT=3000
ENV JWT_SECRET=cambiar-en-produccion
EXPOSE 3000
CMD ["node", "server.js"]
