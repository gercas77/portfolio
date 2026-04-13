output "vpc_id" {
    description = "VPC ID"
    value       = module.networking.vpc_id
}

output "alb_dns_name" {
    description = "ALB DNS name"
    value       = module.ecs.alb_dns_name
}

output "cloudfront_domain" {
    description = "CloudFront distribution domain"
    value       = module.cdn.distribution_domain
}

output "ecr_repository_url" {
    description = "ECR repository URL for Docker images"
    value       = module.ecr.repository_url
}

output "nameservers" {
    description = "Route 53 nameservers — set these at your domain registrar"
    value       = module.dns.nameservers
}

output "ecs_cluster_name" {
    description = "ECS cluster name"
    value       = module.ecs.cluster_name
}
