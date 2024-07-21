#!/bin/bash

tf_command=$1

#MY_IP=$(ipconfig getifaddr en1)
MY_IP=127.0.0.1

. ~/.keycloak.secrets

[ -f ~/.noidcske.secrets ] || echo "NOIDCSKE_CLIENT_SECRET=$(openssl rand -base64 32)" > ~/.noidcske.secrets
. ~/.noidcske.secrets

# export TF_LOG=DEBUG
terraform init &&
  terraform $tf_command -auto-approve \
    -var=keycloak_url=$KEYCLOAK_URL \
    -var="tf_client_secret=$KEYCLOAK_TF_CLIENT_SECRET" \
    -var="client_secret=$NOIDCSKE_CLIENT_SECRET" \
    -var="app_hostname=$MY_IP"
