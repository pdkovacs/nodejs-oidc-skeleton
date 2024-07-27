resource "aws_cognito_user_pool" "pool" {
  name                = "nodejs-oidc-boilerplate"
	username_attributes = ["email"]
	email_configuration {
		email_sending_account = "COGNITO_DEFAULT"
	}
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "nodejs-oidc-boilerplate-mvudg7noyqu"
  user_pool_id = aws_cognito_user_pool.pool.id
}

resource "aws_cognito_user_pool_ui_customization" "main" {
  user_pool_id = aws_cognito_user_pool_domain.main.user_pool_id
	css          = ".label-customizable {font-weight: 400;}"
}

resource "aws_cognito_user_group" "users" {
  name         = "USERS"
  user_pool_id = aws_cognito_user_pool.pool.id
}

resource "aws_cognito_user_group" "privileged_users" {
  name         = "PRIVILEGED_USERS"
  user_pool_id = aws_cognito_user_pool.pool.id
}

resource "aws_cognito_user" "testuser" {
  user_pool_id = aws_cognito_user_pool.pool.id
  username     = "no-reply@hashicorp.com"
	password		 = "${var.testuser_password}"

  attributes = {
    email          = "no-reply@hashicorp.com"
    email_verified = true
  }
}

resource "aws_cognito_user_in_group" "testuser_users" {
  user_pool_id = aws_cognito_user_pool.pool.id
  group_name   = aws_cognito_user_group.users.name
  username     = aws_cognito_user.testuser.username
}

resource "aws_cognito_user" "privileged_testuser" {
  user_pool_id = aws_cognito_user_pool.pool.id
  username     = "no-reply-privileged@hashicorp.com"
	password		 = "${var.privileged_testuser_password}"

  attributes = {
    email          = "no-reply-privileged@hashicorp.com"
    email_verified = true
  }
}

resource "aws_cognito_user_in_group" "privileged_testuser_users" {
  user_pool_id = aws_cognito_user_pool.pool.id
  group_name   = aws_cognito_user_group.users.name
  username     = aws_cognito_user.privileged_testuser.username
}

resource "aws_cognito_user_in_group" "privileged_testuser_privileged_users" {
  user_pool_id = aws_cognito_user_pool.pool.id
  group_name   = aws_cognito_user_group.privileged_users.name
  username     = aws_cognito_user.privileged_testuser.username
}
