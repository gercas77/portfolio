output "cluster_name" {
    description = "ECS cluster name"
    value       = aws_ecs_cluster.main.name
}

output "cluster_arn" {
    description = "ECS cluster ARN"
    value       = aws_ecs_cluster.main.arn
}

output "service_name" {
    description = "ECS web service name"
    value       = aws_ecs_service.web.name
}

output "alb_dns_name" {
    description = "ALB DNS name"
    value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
    description = "ALB hosted zone ID (for Route 53 alias)"
    value       = aws_lb.main.zone_id
}

output "alb_arn_suffix" {
    description = "ALB ARN suffix (for CloudWatch metrics)"
    value       = aws_lb.main.arn_suffix
}

output "task_execution_role_arn" {
    description = "ECS task execution role ARN"
    value       = aws_iam_role.ecs_task_execution.arn
}
