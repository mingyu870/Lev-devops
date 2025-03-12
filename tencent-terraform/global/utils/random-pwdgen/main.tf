resource "random_password" "pwd" {
  length           = 16
  special          = true
  override_special = "<>;()&#!^"
}