terraform {
  required_version = ">= 1.8.2"

    required_providers {
      tencentcloud = {
          source = "tencentcloudstack/tencentcloud"
          version = "1.77.8"
        }
    }

##############################
########### terraform Backend 
##############################
    backend "terraform_tfstate_cos" {
        region = ""
        bucket = "terraform-state-cos"
        prefix = "terraform/state"
    }
}

##############################
# provider
##############################
provider "tencentcloud" {
    region = var.tk_region
}

provider "tencentcloud" {
  secret_id = var.secret_id
  secret_key = var.secret_key
}

##############################
########### Modules 
##############################

module "module_cicd" {
  source = "./local"
  count  = terraform.workspace == local.workspace_cicd ? 1 : 0
}

module "module_qta" {
  source = "./local"
  count  = terraform.workspace == local.workspace_qta ? 1 : 0
}

##############################
########### Network 
##############################
module "network" {
  source = "../../../modules/network"

  vpc_name     = "simple-vpc-dev"
  vpc_cidr     = "10.0.0.0/16"
  network_cidr = "10.0.0.0/24"
  subnet_name  = "simple-subnet-dev"
}

##############################
########### CVM
##############################
module "cvm" {
  source = "../../../modules/cvm"

  instance_name  = local.instance_name
  availability_zone = local.availability_zone
  image_id       = local.image_id
  instance_type  = local.instance_type
  system_disk_type = local.disk_type
  system_disk_size = local.disk_size
  allocate_public_ip = local.public_ip
  subnet_id  = tencentcloud_subnet.subnet_s1.id
  internet_max_bandwidth_out = local.bandwidth_out
}
