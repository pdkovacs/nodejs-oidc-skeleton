data "aws_iam_policy" "ssm_core" {
  name = "AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "ssm_for_bastion" {
	role = aws_iam_role.bastion.name
	policy_arn = data.aws_iam_policy.ssm_core.arn
}

resource "aws_iam_instance_profile" "bastion" {
  name = "bastion"
  role = aws_iam_role.bastion.name
}

data "aws_ami" "standard" {
  # executable_users = ["self"]
  most_recent      = true
  owners           = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-*"]
  }

  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}
