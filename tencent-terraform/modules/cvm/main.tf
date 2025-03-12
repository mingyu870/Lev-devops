resource "tencentcloud_instance" "instance_s1" {
  instance_name  = var.instance_name
  availability_zone = var.availability_zone
  image_id       = var.image_id  
  instance_type  = var.instance_type
  system_disk_type = var.disk_type
  system_disk_size = var.disk_size
  allocate_public_ip = var.public_ip
  subnet_id  = tencentcloud_subnet.subnet.id
  internet_max_bandwidth_out = var.bandwidth_out
}