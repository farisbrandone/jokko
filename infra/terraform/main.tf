resource "hcloud_ssh_key" "operator" {
  name       = "jokko-operator"
  public_key = var.ssh_public_key
}

resource "hcloud_firewall" "jokko" {
  name = "jokko"

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = var.admin_source_ips
  }
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
  rule {
    direction  = "in"
    protocol   = "udp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
}

resource "hcloud_server" "app" {
  name         = "jokko-app"
  server_type  = var.server_type
  location     = var.server_location
  image        = "ubuntu-24.04"
  ssh_keys     = [hcloud_ssh_key.operator.id]
  firewall_ids = [hcloud_firewall.jokko.id]

  public_net {
    ipv4_enabled = true
    ipv6_enabled = true
  }
}

# --- DNS Cloudflare --------------------------------------------------------
locals {
  ipv4 = hcloud_server.app.ipv4_address
}

resource "cloudflare_record" "apex" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  type    = "A"
  content = local.ipv4
  proxied = true
}

resource "cloudflare_record" "wildcard" {
  zone_id = var.cloudflare_zone_id
  name    = "*"
  type    = "A"
  content = local.ipv4
  proxied = true
}

resource "cloudflare_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = "api"
  type    = "A"
  content = local.ipv4
  proxied = true
}

resource "cloudflare_record" "dashboard" {
  zone_id = var.cloudflare_zone_id
  name    = "dashboard"
  type    = "A"
  content = local.ipv4
  proxied = true
}

resource "cloudflare_record" "console" {
  zone_id = var.cloudflare_zone_id
  name    = "console"
  type    = "A"
  content = local.ipv4
  proxied = true
}

# Cible des CNAME pour les domaines personnalisés des boutiques :
# joignable en direct (DNS-only) pour laisser Caddy émettre le certificat.
resource "cloudflare_record" "cname_target" {
  zone_id = var.cloudflare_zone_id
  name    = "cname"
  type    = "A"
  content = local.ipv4
  proxied = false
}
