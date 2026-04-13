resource "aws_ecr_repository" "app" {
    name                 = "${var.name_prefix}-web"
    image_tag_mutability = "MUTABLE"
    force_delete         = true

    image_scanning_configuration {
        scan_on_push = true
    }

    tags = { Name = "${var.name_prefix}-ecr" }
}

resource "aws_ecr_lifecycle_policy" "app" {
    repository = aws_ecr_repository.app.name

    policy = jsonencode({
        rules = [
            {
                rulePriority = 1
                description  = "Keep last 10 images"
                selection = {
                    tagStatus   = "any"
                    countType   = "imageCountMoreThan"
                    countNumber = 5
                }
                action = { type = "expire" }
            }
        ]
    })
}
