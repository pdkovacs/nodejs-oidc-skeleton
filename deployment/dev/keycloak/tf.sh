#!/bin/bash

tf_command=$1

#APP_HOSTNAME=$(ipconfig getifaddr en1)
APP_HOSTNAME=nodejs-oidc-boilerplate.local.com

. ~/.keycloak.secrets

[ -f ~/.nodejs-oidc-boilerplate.secrets ] || echo "NODEJS_OIDC_BOILERPLATE_CLIENT_SECRET=$(openssl rand -base64 32)" > ~/.nodejs-oidc-boilerplate.secrets
. ~/.nodejs-oidc-boilerplate.secrets

# export TF_LOG=DEBUG
echo ">>>>>>>> KEYCLOAK_URL: $KEYCLOAK_URL"
terraform init &&
  terraform $tf_command -auto-approve \
    -var=keycloak_url=$KEYCLOAK_URL \
    -var="tf_client_secret=$KEYCLOAK_TF_CLIENT_SECRET" \
    -var="client_secret=$NODEJS_OIDC_BOILERPLATE_CLIENT_SECRET" \
    -var="app_hostname=$APP_HOSTNAME"
