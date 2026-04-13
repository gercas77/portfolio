data "aws_ssm_parameter" "ecs_ami" {
    name = "/aws/service/ecs/optimized-ami/amazon-linux-2023/recommended/image_id"
}

# --- IAM: EC2 instance role for ECS ---

resource "aws_iam_role" "ecs_instance" {
    name = "${var.name_prefix}-ecs-instance"

    assume_role_policy = jsonencode({
        Version = "2012-10-17"
        Statement = [{
            Effect    = "Allow"
            Principal = { Service = "ec2.amazonaws.com" }
            Action    = "sts:AssumeRole"
        }]
    })

    tags = { Name = "${var.name_prefix}-ecs-instance-role" }
}

resource "aws_iam_role_policy_attachment" "ecs_instance" {
    role       = aws_iam_role.ecs_instance.name
    policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

resource "aws_iam_role_policy_attachment" "ecs_instance_ssm" {
    role       = aws_iam_role.ecs_instance.name
    policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ecs" {
    name = "${var.name_prefix}-ecs-instance-profile"
    role = aws_iam_role.ecs_instance.name
}

# --- IAM: ECS task execution role ---

resource "aws_iam_role" "ecs_task_execution" {
    name = "${var.name_prefix}-ecs-task-exec"

    assume_role_policy = jsonencode({
        Version = "2012-10-17"
        Statement = [{
            Effect    = "Allow"
            Principal = { Service = "ecs.amazonaws.com" }
            Action    = "sts:AssumeRole"
        }]
    })

    tags = { Name = "${var.name_prefix}-ecs-task-exec-role" }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
    role       = aws_iam_role.ecs_task_execution.name
    policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_task_secrets" {
    name = "${var.name_prefix}-ecs-secrets-access"
    role = aws_iam_role.ecs_task_execution.id

    policy = jsonencode({
        Version = "2012-10-17"
        Statement = [{
            Effect   = "Allow"
            Action   = ["secretsmanager:GetSecretValue"]
            Resource = ["arn:aws:secretsmanager:*:*:secret:${var.name_prefix}/*"]
        }]
    })
}

# --- ECS Cluster ---

resource "aws_ecs_cluster" "main" {
    name = "${var.name_prefix}-cluster"

    setting {
        name  = "containerInsights"
        value = "enabled"
    }

    tags = { Name = "${var.name_prefix}-cluster" }
}

# --- Launch template ---

resource "aws_launch_template" "ecs" {
    name_prefix   = "${var.name_prefix}-ecs-"
    image_id      = data.aws_ssm_parameter.ecs_ami.value
    instance_type = var.instance_type

    iam_instance_profile { arn = aws_iam_instance_profile.ecs.arn }

    vpc_security_group_ids = [var.ecs_sg_id]

    user_data = base64encode(<<-EOF
        #!/bin/bash
        echo "ECS_CLUSTER=${aws_ecs_cluster.main.name}" >> /etc/ecs/ecs.config
    EOF
    )

    key_name = var.key_pair_name != "" ? var.key_pair_name : null

    monitoring {
        enabled = true
    }

    tag_specifications {
        resource_type = "instance"
        tags          = { Name = "${var.name_prefix}-ecs-instance" }
    }

    lifecycle { create_before_destroy = true }
}

# --- Auto Scaling Group ---

resource "aws_autoscaling_group" "ecs" {
    name_prefix         = "${var.name_prefix}-ecs-"
    desired_capacity    = 1
    min_size            = 1
    max_size            = 2
    vpc_zone_identifier = var.public_subnet_ids

    launch_template {
        id      = aws_launch_template.ecs.id
        version = "$Latest"
    }

    tag {
        key                 = "AmazonECSManaged"
        value               = true
        propagate_at_launch = true
    }

    lifecycle { create_before_destroy = true }
}

resource "aws_ecs_capacity_provider" "ec2" {
    name = "${var.name_prefix}-ec2"

    auto_scaling_group_provider {
        auto_scaling_group_arn         = aws_autoscaling_group.ecs.arn
        managed_termination_protection = "DISABLED"

        managed_scaling {
            maximum_scaling_step_size = 1
            minimum_scaling_step_size = 1
            status                    = "ENABLED"
            target_capacity           = 100
        }
    }

    tags = { Name = "${var.name_prefix}-ec2-capacity" }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
    cluster_name       = aws_ecs_cluster.main.name
    capacity_providers = [aws_ecs_capacity_provider.ec2.name]

    default_capacity_provider_strategy {
        capacity_provider = aws_ecs_capacity_provider.ec2.name
        base              = 1
        weight            = 100
    }
}

# --- ALB ---

resource "aws_lb" "main" {
    name               = "${var.name_prefix}-alb"
    internal           = false
    load_balancer_type = "application"
    security_groups    = [var.alb_sg_id]
    subnets            = var.public_subnet_ids

    tags = { Name = "${var.name_prefix}-alb" }
}

resource "aws_lb_target_group" "web" {
    name        = "${var.name_prefix}-web-tg"
    port        = 3000
    protocol    = "HTTP"
    vpc_id      = var.vpc_id
    target_type = "instance"

    health_check {
        path                = "/"
        protocol            = "HTTP"
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout             = 5
        interval            = 30
        matcher             = "200-399"
    }

    tags = { Name = "${var.name_prefix}-web-tg" }
}

resource "aws_lb_listener" "https" {
    load_balancer_arn = aws_lb.main.arn
    port              = 443
    protocol          = "HTTPS"
    ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
    certificate_arn   = var.certificate_arn

    default_action {
        type             = "forward"
        target_group_arn = aws_lb_target_group.web.arn
    }

    tags = { Name = "${var.name_prefix}-https-listener" }
}

resource "aws_lb_listener" "http_redirect" {
    load_balancer_arn = aws_lb.main.arn
    port              = 80
    protocol          = "HTTP"

    default_action {
        type = "redirect"
        redirect {
            port        = "443"
            protocol    = "HTTPS"
            status_code = "HTTP_301"
        }
    }

    tags = { Name = "${var.name_prefix}-http-redirect" }
}

# --- ECS Task Definition (web) ---

resource "aws_cloudwatch_log_group" "web" {
    name              = "/ecs/${var.name_prefix}-web"
    retention_in_days = 30

    tags = { Name = "${var.name_prefix}-web-logs" }
}

resource "aws_ecs_task_definition" "web" {
    count = var.deploy_service ? 1 : 0

    family                   = "${var.name_prefix}-web"
    requires_compatibilities = ["EC2"]
    network_mode             = "bridge"
    execution_role_arn       = aws_iam_role.ecs_task_execution.arn
    cpu                      = 512
    memory                   = 512

    container_definitions = jsonencode([{
        name      = "web"
        image     = "${var.ecr_repository_url}:latest"
        essential = true

        portMappings = [{
            containerPort = 3000
            hostPort      = 0
            protocol      = "tcp"
        }]

        logConfiguration = {
            logDriver = "awslogs"
            options = {
                "awslogs-group"         = aws_cloudwatch_log_group.web.name
                "awslogs-region"        = "us-east-1"
                "awslogs-stream-prefix" = "web"
            }
        }
    }])

    tags = { Name = "${var.name_prefix}-web-task" }
}

# --- ECS Service ---

resource "aws_ecs_service" "web" {
    count = var.deploy_service ? 1 : 0

    name            = "${var.name_prefix}-web"
    cluster         = aws_ecs_cluster.main.id
    task_definition = aws_ecs_task_definition.web[0].arn
    desired_count   = 1

    capacity_provider_strategy {
        capacity_provider = aws_ecs_capacity_provider.ec2.name
        base              = 1
        weight            = 100
    }

    load_balancer {
        target_group_arn = aws_lb_target_group.web.arn
        container_name   = "web"
        container_port   = 3000
    }

    deployment_minimum_healthy_percent = 0
    deployment_maximum_percent         = 100

    depends_on = [aws_lb_listener.https]

    tags = { Name = "${var.name_prefix}-web-service" }
}
