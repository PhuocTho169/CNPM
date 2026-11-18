FROM node:22-alpine3.20
RUN apk add --no-cache python3 py3-pip && pip3 install --no-cache-dir --break-system-packages edge-tts

WORKDIR /app
COPY server/package.json ./server/package.json
WORKDIR /app/server
RUN npm install --production=false          # -> /app/server/node_modules (file thật, không symlink)
COPY server ./
COPY database /app/database
WORKDIR /app/server
EXPOSE 5000
CMD ["sh","-c","node src/db/migrate.js && node src/db/seed.js && node src/index.js"]