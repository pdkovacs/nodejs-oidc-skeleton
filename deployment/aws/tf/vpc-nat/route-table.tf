resource "aws_route_table" "private_subnets" {
  count  = length(var.azs)
	vpc_id = data.aws_vpc.this.id
	
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_nat_gateway.public[count.index].id
  }

  tags = {
    Name = "For private subnets"
  }
}
