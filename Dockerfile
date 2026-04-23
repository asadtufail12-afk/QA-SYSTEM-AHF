FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

RUN npm install --prefix ./server
RUN npm install --prefix ./client
RUN npm install --prefix ./client

COPY . .

WORKDIR /app/server
EXPOSE 5000

CMD ["npm", "start"]