FROM node:22-slim

COPY . .

RUN npm install --production

ENTRYPOINT ["node", "/dist/main.js"]
