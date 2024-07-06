variable "vpc_id" {
  description = "Existing VPC to use (specify this, if you don't want to create new VPC)"
  type        = string
  default     = ""
}

variable "vpc_cidr" {
  description = "The CIDR block for the VPC. Default value is a valid CIDR, but not acceptable by AWS and should be overriden"
  type        = string
}

variable "azs" {
  type = list(string)
}

variable "vpc_name" {
  type = string
}

variable "public_subnet_cidrs" {
	type = list(string)
}

variable "public_ssh" {
	type = bool
}
