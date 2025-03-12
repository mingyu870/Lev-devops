# Tencent IAM
variable "secret_id" {
  default     = null
  type        = string
  description = "IAM SECRET ID. "
}

variable "secret_key" {
  default     = null
  type        = string
  description = "IAM SECRET KEY"
}

variable "tk_region" {
  default     = null
  type        = string
  description = "Tencent region"
}