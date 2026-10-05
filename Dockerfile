FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

FROM base AS build
WORKDIR /src
RUN apk add --no-cache git python3 alpine-sdk
RUN git clone --depth 1 https://github.com/imputnet/cobalt.git /src
RUN corepack enable
RUN pnpm install --prod --frozen-lockfile
RUN pnpm deploy --filter=@imput/cobalt-api --prod /prod/api
RUN cp -a /src/.git /prod/api/.git

FROM base AS api
WORKDIR /app
COPY --from=build --chown=node:node /prod/api /app
USER node
EXPOSE 9000
CMD [ "node", "src/cobalt" ]
