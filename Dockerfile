FROM node:22-alpine
LABEL "language"="nodejs"
LABEL "framework"="react"

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

EXPOSE 8080

CMD ["npm", "run", "preview"]
