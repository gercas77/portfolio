output "secret_arn" {
    description = "Secrets Manager secret ARN"
    value       = aws_secretsmanager_secret.app.arn
}

output "secret_name" {
    description = "Secrets Manager secret name"
    value       = aws_secretsmanager_secret.app.name
}
