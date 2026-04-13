variable "name_prefix" {
    description = "Prefix for resource names"
    type        = string
}

variable "domain_name" {
    description = "Root domain name"
    type        = string
}

variable "alb_dns_name" {
    description = "ALB DNS name to use as origin"
    type        = string
}

variable "certificate_arn" {
    description = "ACM certificate ARN for CloudFront"
    type        = string
}

variable "zone_id" {
    description = "Route 53 hosted zone ID"
    type        = string
}
