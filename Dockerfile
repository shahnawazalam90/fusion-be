FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# REMOVE this line:
# RUN npm install

COPY . .

EXPOSE 3000

# Instead of `npm start`, do npm install then npm start
CMD ["sh", "-c", "npm install && npm start"]
