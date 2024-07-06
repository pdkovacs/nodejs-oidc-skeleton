resource "aws_default_network_acl" "main" {
  default_network_acl_id = aws_vpc.this.default_network_acl_id
	lifecycle {
    ignore_changes = [subnet_ids, ingress, egress]
  }
}

resource "aws_network_acl" "public" {
	vpc_id = aws_vpc.this.id
	
	lifecycle {
    ignore_changes = [subnet_ids, ingress, egress]
  }

	tags = {
    Name = "For public subnets"
  }
}

resource "aws_network_acl_rule" "allow_ssh_in_maybe" {
	count          = var.public_ssh ? 1 : 0
  network_acl_id = aws_network_acl.public.id
  rule_number    = 200
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "${chomp(data.http.myip.response_body)}/32"
  from_port      = 22
  to_port        = 22
}

resource "aws_network_acl_rule" "allow_ephemeral_in" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 300
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 1024
  to_port        = 65535
}

resource "aws_network_acl_rule" "allow_ephemeral_out" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 200
  egress         = true
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 1024
  to_port        = 65535
}

resource "aws_network_acl_rule" "allow_https_out" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 300
  egress         = true
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 443
  to_port        = 443
}
