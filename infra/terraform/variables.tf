variable "hcloud_token" {
  type      = string
  sensitive = true
}

variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

variable "cloudflare_zone_id" {
  type        = string
  description = "Zone Cloudflare de jokko.shop"
}

variable "root_domain" {
  type    = string
  default = "jokko.shop"
}

variable "server_type" {
  type    = string
  default = "cpx41" # 8 vCPU / 16 Go
}

variable "server_location" {
  type    = string
  default = "fsn1"
}

variable "ssh_public_key" {
  type        = string
  description = "Clé publique SSH de l'opérateur"
}

variable "admin_source_ips" {
  type        = list(string)
  description = "IPs autorisées à joindre le port 22"
  default     = ["0.0.0.0/0", "::/0"]
}
