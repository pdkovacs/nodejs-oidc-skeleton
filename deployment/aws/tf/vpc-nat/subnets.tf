resource "aws_subnet" "private" {
	count = length(tolist(var.azs))
  vpc_id     = data.aws_vpc.this.id
	availability_zone = var.azs[count.index]
  cidr_block = var.private_subnet_cidrs[count.index]
	map_public_ip_on_launch = false
	
	tags = {
		isolation = "private"
	}
}

resource "aws_network_acl_association" "private_subnets" {
	count = length(tolist(var.azs))
  network_acl_id = aws_network_acl.private.id
  subnet_id      = aws_subnet.private[count.index].id
}

resource "aws_route_table_association" "private_subnets" {
	count = length(tolist(var.azs))
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private_subnets[count.index].id
}
