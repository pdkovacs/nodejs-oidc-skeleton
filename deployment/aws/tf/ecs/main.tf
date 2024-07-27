data "aws_vpc" "main" {
  filter {
    name = "tag:Name"
    values = [ var.vpc_name ]
  }
}

data "aws_cognito_user_pools" "pool" {
	name = "nodejs-oidc-boilerplate"
}

data "aws_cognito_user_pool_clients" "clients" {
	user_pool_id = data.aws_cognito_user_pools.pool.ids[0]
}

data "aws_secretsmanager_secret" "client_secret" {
  name = "/config/client_secret"
}

data "aws_secretsmanager_secret_version" "client_secret_version" {
  secret_id = data.aws_secretsmanager_secret.client_secret.id
}

data "aws_ssm_parameter" "callback_url" {
  name  = "/config/nodejs-oidc-boilerplate/callback-url"
}

data "aws_lb_target_group" "private" {
  name = "lb-private"
}

data "aws_subnets" "services" {
    filter {
        name = "tag:isolation"
        values = [ "private" ]
    }
}

data "aws_security_group" "lb_private" {
  filter {
    name = "tag:Name"
    values = [ "lb private" ]
  }
}

resource "aws_ecs_task_definition" "test" {
  family = "service"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn = aws_iam_role.ecs_task_execution.arn
  network_mode = "awsvpc"
	
  cpu       = 256
  memory    = 512
  container_definitions = jsonencode([
    {
      name      = "test-container"
      image     = "${data.aws_caller_identity.current.account_id}.dkr.ecr.eu-west-1.amazonaws.com/nodejs-oidc-boilerplate:${var.app_version}"
      cpu       = 256
      memory    = 512
      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
        }
      ]
      environment = [
        { name = "NODE_OIDC_BPLATE_SERVER_HOST",   value = "0.0.0.0" },
        { name = "NODE_OIDC_BPLATE_SERVER_PORT",   value = "8080" },
        { name = "NODE_OIDC_BPLATE_TOKEN_ISSUER",  value = "https://cognito-idp.eu-west-1.amazonaws.com/${data.aws_cognito_user_pools.pool.ids[0]}" },
        { name = "NODE_OIDC_BPLATE_CLIENT_ID",     value = data.aws_cognito_user_pool_clients.clients.client_ids[0] },
        { name = "NODE_OIDC_BPLATE_CALLBACK_URL",  value = data.aws_ssm_parameter.callback_url.value },
        { name = "NODE_OIDC_BPLATE_LOGOUT_URL",    value = "" }
      ]
			secrets: [{
      	name: "NODE_OIDC_BPLATE_CLIENT_SECRET",
      	valueFrom: data.aws_secretsmanager_secret_version.client_secret_version.arn
    	}]
      task_role_arn = aws_iam_role.ecs_task.arn
      logConfiguration: {
          "logDriver": "awslogs",
          "options": {
              "awslogs-create-group": "true",
              "awslogs-group": "nodjes-boilerplate-ecs",
              "awslogs-region": "eu-west-1",
              "awslogs-stream-prefix": "nodjes-boilerplate"
          }
      }
    },
  ])
  depends_on = [
    aws_iam_role_policy_attachment.ecs_task_execution
  ]
}

resource "aws_ecs_cluster" "test" {
  name = "nodjes-boilerplate"
}

resource "aws_security_group" "test_service" {
  name = "nodjes-boilerplate"
  vpc_id = data.aws_vpc.main.id

  ingress {
    description      = "TLS from VPC"
    from_port        = 8080
    to_port          = 8080
    protocol         = "tcp"
    cidr_blocks      = [data.aws_vpc.main.cidr_block]
  }

  egress {
    from_port        = 443
    to_port          = 443
    protocol         = "TCP"
    cidr_blocks      = ["0.0.0.0/0"]
  }

  tags = {
    "Name" = "service"
  }
}

resource "aws_ecs_service" "test" {
  name            = "test-service"
  cluster         = aws_ecs_cluster.test.id
  task_definition = aws_ecs_task_definition.test.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets = data.aws_subnets.services.ids
    security_groups = [ data.aws_security_group.lb_private.id, aws_security_group.test_service.id ]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = data.aws_lb_target_group.private.arn
    container_name   = "test-container"
    container_port   = 8080
  }
}
