variable "public_key_file" {
	type = string
	default = "/home/pkovacs/.ssh/aws_bastion.pub"
}

variable "public_ssh" {
	type = bool
}

variable "vpc_name" {
	type = string
}
