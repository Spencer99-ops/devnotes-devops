# Stage 1 : Build du frontend React
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2 : Image finale Node.js / Express + build React
FROM node:22-alpine AS runtime
WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production
ENV PORT=5111
EXPOSE 5111

CMD ["node", "backend/server.js"]
