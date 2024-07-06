variable "azs" {
  type = list(string)
}

variable "vpc_name" {
  type = string
}

variable "public_subnets_cidr" {
  type = string
}

variable "private_subnets_cidr" {
  type = string
}

variable "private_subnet_cidrs" {
  type = list(string)
}

variable "private_service_ports" {
  type = list(number)
}
