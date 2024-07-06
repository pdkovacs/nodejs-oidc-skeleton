data "aws_cognito_user_pools" "pool" {
	name = "nodejs-oidc-skeleton"
}

resource "aws_cognito_user_pool_client" "client" {
  name                = "nodejs-oidc-skeleton-client"
  user_pool_id        = data.aws_cognito_user_pools.pool.ids[0]
	callback_urls       = ["${aws_apigatewayv2_api.nodjs_skeleton.api_endpoint}/oidc-callback"]
	generate_secret     = true
	allowed_oauth_flows = ["code"]
}

resource "aws_secretsmanager_secret" "client_secret" {
  name = "/config/client_secret"
}

resource "aws_secretsmanager_secret_version" "sole" {
  secret_id     = aws_secretsmanager_secret.client_secret.id
  secret_string = aws_cognito_user_pool_client.client.client_secret
}
