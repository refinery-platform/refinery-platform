output "vpc_id" {
  value = "${aws_vpc.vpc.id}"
}

output "private_subnet_id" {
  value = "${aws_subnet.private_subnet.id}"
}

output "public_subnet_id_a" {
  value = "${aws_subnet.public_subnet_a.id}"
}

output "public_subnet_id_b" {
  value = "${aws_subnet.public_subnet_b.id}"
}