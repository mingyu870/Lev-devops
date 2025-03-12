locals {
  workspace_cicd = "cicd"
  workspace_qta  = "qta"
}

locals {
  instance_name  = "InstanceS1"
  availability_zone = "ap-seoul-1"
  image_id       = "img-1u6l2XXX"  
  instance_type  = "S5.LARGE8"
  system_disk_type = "CLOUD_PREMIUM"
  system_disk_size = 50
  allocate_public_ip = true
  internet_max_bandwidth_out = 10
}