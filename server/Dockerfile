FROM node:22-alpine3.20
WORKDIR /app


# Install Python and edge-tts for Microsoft Edge TTS
RUN apk add --no-cache python3 py3-pip && pip3 install --no-cache-dir --break-system-packages edge-tts


# Copy server package and install dependencies
COPY server/package.json ./package.json
WORKDIR /app


RUN npm install --production=false


COPY server ./server
COPY database ./database


WORKDIR /app/server


EXPOSE 5000


CMD ["sh", "-c", "node src/db/migrate.js && node src/db/seed.js && node src/index.js"]

