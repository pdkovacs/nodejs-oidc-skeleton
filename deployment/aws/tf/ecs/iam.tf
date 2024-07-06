data "aws_caller_identity" "current" {}

data "aws_iam_policy" "ecs_execution_task" {
  name = "AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task_execution" {
  name = "iam_for_ecs_task_execution"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
	role = aws_iam_role.ecs_task_execution.name
	policy_arn = data.aws_iam_policy.ecs_execution_task.arn
}

resource "aws_iam_role_policy" "task_exec_get_client_secret" {
  name = "task_exec_get_client_secret"
  role = aws_iam_role.ecs_task_execution.id

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "${data.aws_secretsmanager_secret_version.client_secret_version.arn}"
    }
  ]
}
EOF
}



resource "aws_iam_role_policy" "task_exec_cloudwatch" {
  name = "task_exec_cloudwatch"
  role = aws_iam_role.ecs_task_execution.id

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams",
                "logs:PutLogEvents",
                "logs:GetLogEvents",
                "logs:FilterLogEvents"
            ],
            "Resource": "*"
        }
    ]
}
EOF
}

resource "aws_iam_role_policy" "task_exec_access_secrets" {
  name = "default"
  role = aws_iam_role.ecs_task_execution.id

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams",
                "logs:PutLogEvents",
                "logs:GetLogEvents",
                "logs:FilterLogEvents"
            ],
            "Resource": "*"
        }
    ]
}
EOF
}

resource "aws_iam_role" "ecs_task" {
  name = "iam_for_ecs_task"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "cloudwatch" {
  name = "default"
  role = aws_iam_role.ecs_task.id

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams",
                "logs:PutLogEvents",
                "logs:GetLogEvents",
                "logs:FilterLogEvents"
            ],
            "Resource": "*"
        }
    ]
}
EOF
}
