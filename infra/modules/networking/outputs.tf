output "vpc_id" {
    description = "VPC ID"
    value       = aws_vpc.main.id
}

output "public_subnet_ids" {
    description = "Public subnet IDs"
    value       = aws_subnet.public[*].id
}

output "alb_sg_id" {
    description = "ALB security group ID"
    value       = aws_security_group.alb.id
}

output "ecs_sg_id" {
    description = "ECS instances security group ID"
    value       = aws_security_group.ecs.id
}
