resource "aws_subnet" "public" {
	count = length(tolist(var.azs))
  vpc_id     = aws_vpc.this.id
	availability_zone = var.azs[count.index]
  cidr_block = var.public_subnet_cidrs[count.index]
	map_public_ip_on_launch = true
	
	tags = {
		isolation = "public"
	}
}

resource "aws_network_acl_association" "public_subnets" {
	count = length(tolist(var.azs))
  network_acl_id = aws_network_acl.public.id
  subnet_id      = aws_subnet.public[count.index].id
}

resource "aws_route_table_association" "public_subnets" {
	count = length(tolist(var.azs))
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public_subnets.id
}
