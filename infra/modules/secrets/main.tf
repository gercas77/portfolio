resource "aws_secretsmanager_secret" "app" {
    name                    = "${var.name_prefix}/app-env"
    description             = "Application environment variables (MONGODB_URI, OPENAI_API_KEY, etc.)"
    recovery_window_in_days = 7

    tags = { Name = "${var.name_prefix}-app-secrets" }
}
