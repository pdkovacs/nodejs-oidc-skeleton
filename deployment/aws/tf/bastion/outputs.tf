output "bastion_security_group_id" {
  description = "Bastion security group ID"
  value = aws_security_group.bastion.id
}

output "bastion_public_dns" {
	value = aws_instance.bastion.public_dns
}

output "bastion_public_ip" {
	value = aws_instance.bastion.public_ip
}

output "bastion_id" {
	value = aws_instance.bastion.id
}
