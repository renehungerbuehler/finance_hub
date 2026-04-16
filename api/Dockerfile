FROM node:20-alpine
# openssl: required by Prisma
# tesseract-ocr + language packs: image OCR for /api/scan-attachment
#   (eng+deu+fra+ita covers the four Swiss national languages + English)
# poppler-utils: provides `pdftoppm` for the scanned-PDF fallback
#   (renders each page to PNG, then tesseract OCRs them)
RUN apk add --no-cache \
    openssl \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    tesseract-ocr-data-deu \
    tesseract-ocr-data-fra \
    tesseract-ocr-data-ita \
    poppler-utils
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
EXPOSE 3001
CMD ["sh", "-c", "until npx prisma db push; do echo 'DB not ready, retrying in 3s...'; sleep 3; done && node index.js"]
