FROM node:20-alpine
RUN npm install -g pnpm
WORKDIR /app
COPY . .
ENV CI=true
RUN pnpm install
RUN pnpm build
EXPOSE 5173
CMD ["pnpm", "dev", "--host"]
