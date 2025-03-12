data "tencentcloud_user_info" "info" {}

locals {
  app_id = data.tencentcloud_user_info.info.app_id
}

resource "tencentcloud_cos_bucket" "private_bucket" {
  bucket                = "private-bucket-${local.app_id}"
  acl                   = "private"
  versioning_enable     = false
  acceleration_enable   = false
}

resource "tencentcloud_cos_bucket" "private_bucket" {
  bucket                = "terraform-state-cos-${local.app_id}"
  acl                   = "private"
  versioning_enable     = true
  acceleration_enable   = false
}