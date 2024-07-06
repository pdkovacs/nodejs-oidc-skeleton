data "aws_vpc" "this" {
	filter {
		name = "tag:Name"
		values = [ var.vpc_name ]
	}
}

data "aws_subnets" "public" {
	filter {
		name = "tag:isolation"
		values = [ "public" ]
	}
}

resource "aws_security_group" "bastion" {
	name        = "bastion"
	vpc_id      = data.aws_vpc.this.id

	ingress {
		protocol    = "tcp"
		from_port   = 0
		to_port     = 65535
		self        = true
	}

	egress {
		from_port   = 0
		to_port     = 0
		protocol    = "-1"
		cidr_blocks = ["0.0.0.0/0"]
	}
}

data "http" "myip" {
  url = "https://checkip.amazonaws.com/"

	request_headers = {
    Accept = "text/*, application/json"
  }
}

resource "aws_security_group_rule" "ssh" {
	count             = var.public_ssh ? 1 : 0
  type              = "ingress"
	from_port         = 22
	to_port           = 22
  protocol          = "tcp"
	cidr_blocks       = ["${chomp(data.http.myip.response_body)}/32"]
  security_group_id = aws_security_group.bastion.id
}

resource "aws_iam_role" "bastion" {
  name = "iam_for_bastion"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_key_pair" "bastion" {
  key_name   = "bastion-key"
  public_key = file(var.public_key_file)
}

resource "aws_instance" "bastion" {
  ami           = "ami-00ce328eb1ed0570d" # data.aws_ami.standard.id
  instance_type = "t3.micro"
	key_name = aws_key_pair.bastion.key_name
  subnet_id   = data.aws_subnets.public.ids[0]
	security_groups = [ aws_security_group.bastion.id ]
	iam_instance_profile = aws_iam_instance_profile.bastion.name

  tags = {
    Name = "bastion"
  }
}