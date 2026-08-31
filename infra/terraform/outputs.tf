output "server_ipv4" {
  value = hcloud_server.app.ipv4_address
}

output "server_ipv6" {
  value = hcloud_server.app.ipv6_address
}

output "ansible_inventory" {
  value = "jokko ansible_host=${hcloud_server.app.ipv4_address} ansible_user=root"
}
