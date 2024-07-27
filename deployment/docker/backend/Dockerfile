FROM node:lts-slim

LABEL Name="nodejs-oidc-boilerplate-backend"
LABEL Version="1.0.0"

RUN useradd -u 1101 -m --shell /bin/false boilerplate

RUN apt-get update -y && apt-get install git -y

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY bundle.js ./

EXPOSE 8080

RUN mkdir /data
RUN chown boilerplate /data

VOLUME ["/data"]

USER boilerplate

CMD [ "node", "bundle.js" ]
