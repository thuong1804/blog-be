FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma

RUN npx prisma generate

COPY . .

EXPOSE 3005

CMD ["sh", "-c", "npm run migrate && npm run start"]