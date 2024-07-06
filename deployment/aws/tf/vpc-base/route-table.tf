resource "aws_route_table" "public_subnets" {
	vpc_id = aws_vpc.this.id
	
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "For public subnets"
  }
}
