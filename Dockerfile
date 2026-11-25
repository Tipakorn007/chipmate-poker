FROM oven/bun:1
WORKDIR /app
COPY server/index.ts server/index.ts
COPY src/game/ src/game/
COPY src/data/mock.ts src/data/mock.ts
ENV HOST=0.0.0.0
ENV PORT=3001
EXPOSE 3001
CMD ["bun", "run", "server/index.ts"]
