data "aws_vpc" "this" {

filter {
    name = "tag:Name"
    values = [ var.vpc_name ]
}
}

data "aws_subnets" "services" {
    filter {
        name = "tag:isolation"
        values = [ "private" ]
    }
}

locals {
  private_subnets_cidr  = "172.31.1.0/24"
}

resource "aws_security_group" "lb_private" {
  name = "lb private"
  vpc_id = data.aws_vpc.this.id

  ingress {
    description      = "TLS from VPC"
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    cidr_blocks      = [data.aws_vpc.this.cidr_block]
  }

  ingress {
    description      = "loopback"
    from_port        = 0
    to_port          = 65535
    protocol         = "tcp"
    self             = true
  }

  egress {
    from_port        = 0
    to_port          = 65535
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
  }

  tags = {
    "Name" = "lb private"
  }
}

resource "aws_lb" "private" {
  name               = "lb-private"
  internal           = true
  load_balancer_type = "application"
  security_groups    = [aws_security_group.lb_private.id]
  subnets            = data.aws_subnets.services.ids
}

resource "aws_lb_target_group" "private" {
  name     = "lb-private"
  target_type = "ip"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = data.aws_vpc.this.id
}

resource "aws_lb_listener" "private" {
  load_balancer_arn = aws_lb.private.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.private.arn
  }
}
