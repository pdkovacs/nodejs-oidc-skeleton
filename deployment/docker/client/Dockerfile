FROM nginx:1.23.3

LABEL Name="node-oidc-boilerplate-client"
LABEL Version="1.0.0"

RUN mkdir -p /opt/node-oidc-boilerplate
COPY ./assets /opt/node-oidc-boilerplate/assets/
COPY ./index.html /opt/node-oidc-boilerplate/
COPY ./nginx.conf /etc/nginx/

EXPOSE 8080
