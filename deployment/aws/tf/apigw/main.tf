data "aws_vpc" "main" {
  filter {
    name = "tag:Name"
    values = [ var.vpc_name ]
  }
}

resource "aws_apigatewayv2_vpc_link" "nodjs_boilerplate" {
  name               = "nodjs_boilerplate"
  security_group_ids = [aws_security_group.lb_private.id]
  subnet_ids         = data.aws_subnets.services.ids

  tags = {
    Usage = "nodjs_boilerplate"
  }
}

resource "aws_apigatewayv2_api" "nodjs_boilerplate" {
  name          = "private-integration-nodjes-boilerplate"
  protocol_type = "HTTP"
}

resource "aws_ssm_parameter" "callback_url" {
  name  = "/config/nodejs-oidc-boilerplate/callback-url"
  type  = "String"
  value = "${aws_apigatewayv2_api.nodjs_boilerplate.api_endpoint}/oidc-callback"
}


resource "aws_apigatewayv2_integration" "nodjs_boilerplate" {
  api_id           = aws_apigatewayv2_api.nodjs_boilerplate.id
  integration_type = "HTTP_PROXY"
  integration_uri  = aws_lb_listener.private.arn

  integration_method = "ANY"
  connection_type    = "VPC_LINK"
  connection_id      = aws_apigatewayv2_vpc_link.nodjs_boilerplate.id
}

resource "aws_apigatewayv2_route" "nodjs_boilerplate" {
  api_id    = aws_apigatewayv2_api.nodjs_boilerplate.id
  route_key = "ANY /{proxy+}"

  target = "integrations/${aws_apigatewayv2_integration.nodjs_boilerplate.id}"
}

resource "aws_apigatewayv2_stage" "nodjs_boilerplate" {
  name = "$default"
  api_id    = aws_apigatewayv2_api.nodjs_boilerplate.id
  route_settings {
    route_key = "ANY /{proxy+}"
    throttling_burst_limit = 10
    throttling_rate_limit  = 10
  }
  auto_deploy = true

	access_log_settings {
		destination_arn = aws_cloudwatch_log_group.nodjs_boilerplate.arn
		format = "$context.identity.sourceIp - - [$context.requestTime] \"$context.httpMethod $context.routeKey $context.protocol\" $context.status $context.responseLength $context.requestId"
	}

  depends_on = [
    aws_apigatewayv2_route.nodjs_boilerplate
  ]
}
