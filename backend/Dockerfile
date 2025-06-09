FROM node:20-alpine
RUN npm install -g pnpm
WORKDIR /app
COPY . .
ENV CI=true
RUN pnpm install
EXPOSE 4000
CMD ["pnpm", "run", "dev"]
