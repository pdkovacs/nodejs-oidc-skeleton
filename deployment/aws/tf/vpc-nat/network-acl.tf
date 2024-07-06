resource "aws_network_acl" "private" {
	vpc_id = data.aws_vpc.this.id

	lifecycle {
    ignore_changes = [subnet_ids, ingress, egress]
  }

	tags = {
    Name = "For private subnets"
  }
}

#############################################################################################
# Augment rule set of the ACL for the public subnets with traffic to/from the private subnets
#############################################################################################

resource "aws_network_acl_rule" "https_in_from_any_to_public" {
  network_acl_id = data.aws_network_acls.public.ids[0]
  rule_number    = 400
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 443
  to_port        = 443
}

resource "aws_network_acl_rule" "ssh_out_from_public_to_private" {
  network_acl_id = data.aws_network_acls.public.ids[0]
  rule_number    = 400
  egress         = true
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = var.private_subnets_cidr
  from_port      = 22
  to_port        = 22
}

resource "aws_network_acl_rule" "service_calls_out_from_public_to_private" {
  count          = length(var.private_service_ports)
  network_acl_id = data.aws_network_acls.public.ids[0]
  rule_number    = 500 + count.index
  egress         = true
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = var.private_subnets_cidr
  from_port      = 80
  to_port        = var.private_service_ports[count.index]
}

#############################################################################################
# Private subnets
#############################################################################################

resource "aws_network_acl_rule" "ssh_in_from_public_to_private" {
  network_acl_id = aws_network_acl.private.id
  rule_number    = 400
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = var.public_subnets_cidr
  from_port      = 22
  to_port        = 22
}

resource "aws_network_acl_rule" "service_calls_in_from_public_to_private" {
  count          = length(var.private_service_ports)
  network_acl_id = aws_network_acl.private.id
  rule_number    = 500 + count.index
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = var.public_subnets_cidr
  from_port      = var.private_service_ports[count.index]
  to_port        = var.private_service_ports[count.index]
}

resource "aws_network_acl_rule" "http_in_from_public_to_private" {
  network_acl_id = aws_network_acl.private.id
  rule_number    = 590
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = var.private_subnets_cidr
  from_port      = 80
  to_port        = 80
}

resource "aws_network_acl_rule" "replies_in_from_public_to_private" {
  network_acl_id = aws_network_acl.private.id
  rule_number    = 600
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 1024
  to_port        = 65535
}

resource "aws_network_acl_rule" "http_out_from_private_to_public" {
  network_acl_id = aws_network_acl.private.id
  rule_number    = 100
  egress         = true
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = var.private_subnets_cidr
  from_port      = 80
  to_port        = 80
}

resource "aws_network_acl_rule" "https_out_from_private_to_any" {
  network_acl_id = aws_network_acl.private.id
  rule_number    = 200
  egress         = true
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 443
  to_port        = 443
}

resource "aws_network_acl_rule" "replies_out_from_private_to_any" {
  network_acl_id = aws_network_acl.private.id
  rule_number    = 300
  egress         = true
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 1024
  to_port        = 65535
}
