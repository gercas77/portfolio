output "zone_id" {
    description = "Route 53 hosted zone ID"
    value       = aws_route53_zone.main.zone_id
}

output "nameservers" {
    description = "Nameservers to configure at the domain registrar"
    value       = aws_route53_zone.main.name_servers
}

output "certificate_arn" {
    description = "ACM certificate ARN (validated)"
    value       = aws_acm_certificate_validation.main.certificate_arn
}
