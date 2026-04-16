FROM node:20-alpine
# openssl: required by Prisma
# tesseract-ocr + language packs: used by /api/scan-attachment for image OCR
#   (eng+deu+fra+ita covers the four Swiss national languages + English)
RUN apk add --no-cache \
    openssl \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    tesseract-ocr-data-deu \
    tesseract-ocr-data-fra \
    tesseract-ocr-data-ita
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
EXPOSE 3001
CMD ["sh", "-c", "until npx prisma db push; do echo 'DB not ready, retrying in 3s...'; sleep 3; done && node index.js"]
