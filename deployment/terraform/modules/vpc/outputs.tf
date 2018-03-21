output "vpc_id" {
  value = "${aws_vpc.vpc.id}"
}

output "private_subnet_a_id" {
  value = "${aws_subnet.private_subnet_a.id}"
}

output "private_subnet_b_id" {
  value = "${aws_subnet.private_subnet_b.id}"
}

output "public_subnet_id" {
  value = "${aws_subnet.public_subnet.id}"
}

