resource "aws_instance" "docker_host" {
  ami           = "ami-2757f631"
  instance_type = "t2.micro"
}