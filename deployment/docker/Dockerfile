FROM node:lts-slim

LABEL Name="nodejs-oidc-skeleton"
LABEL Version="1.0.0"

RUN useradd -u 1101 -m --shell /bin/false skeleton

RUN apt-get update -y && apt-get install git -y

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY bundle.js ./

EXPOSE 8080

RUN mkdir /data
RUN chown skeleton /data

VOLUME ["/data"]

USER skeleton

CMD [ "node", "bundle.js" ]
