data "aws_vpc" "this" {
	filter {
		name = "tag:Name"
		values = [ var.vpc_name ]
	}
}

data "aws_route_table" "default" {
	filter {
		name = "tag:Name"
		values = [ "default" ]
	}
}

data "aws_internet_gateway" "main" {
  filter {
    name = "tag:Name"
    values = [ "GW ${var.vpc_name}" ]
  }
}

data "aws_network_acls" "public" {
  filter {
    name = "tag:Name"
    values = [ "For public subnets" ]
  }
}

data "aws_subnets" "public" {
  filter {
    name = "tag:isolation"
    values = [ "public" ]
  }
}

resource "aws_eip" "nat" {
  count      = length(var.azs)
  depends_on = [ data.aws_internet_gateway.main ]
}

resource "aws_nat_gateway" "public" {
  count      = length(var.azs)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = data.aws_subnets.public.ids[count.index]

  tags = {
    Name = "gw NAT"
  }

  # To ensure proper ordering, it is recommended to add an explicit dependency
  # on the Internet Gateway for the VPC.
  depends_on = [ data.aws_internet_gateway.main ]
}
