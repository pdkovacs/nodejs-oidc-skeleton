resource "aws_vpc" "this" {
  cidr_block = var.vpc_cidr

	tags = {
		"Name": var.vpc_name
	}
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.this.id

  tags = {
    Name = "GW ${var.vpc_name}"
  }
}

data "http" "myip" {
  url = "https://checkip.amazonaws.com/"

  request_headers = {
    Accept = "text/*, application/json"
  }
}

resource "aws_default_route_table" "default" {
  default_route_table_id = aws_vpc.this.default_route_table_id

  tags = {
    Name = "default"
  }
}
