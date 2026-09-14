FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./
COPY eslint.config.js ./

RUN npx prisma generate
RUN npm run build

FROM node:22-alpine

WORKDIR /app

ENTRYPOINT []

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

EXPOSE 3333

CMD ["sh", "-c", "npx prisma migrate deploy && if [ \"$RUN_SEED\" = \"true\" ]; then npx tsx prisma/seed.ts; fi && node dist/server.js"]