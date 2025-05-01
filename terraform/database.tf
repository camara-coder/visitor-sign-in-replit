# Security Group for RDS
resource "aws_security_group" "postgres" {
  name        = "visitor-sign-in-postgres-sg-${random_string.suffix.result}"
  description = "Allow PostgreSQL traffic"
  vpc_id      = aws_default_vpc.default.id

  ingress {
    description = "PostgreSQL from Lambda"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # For simplicity; restrict in production
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "Visitor Sign-In PostgreSQL SG"
    Environment = var.environment
  }
}

# Use default VPC for simplicity
resource "aws_default_vpc" "default" {
  tags = {
    Name = "Default VPC"
  }
}

# Get availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# Create subnet group
resource "aws_db_subnet_group" "postgres" {
  name       = "visitor-sign-in-postgres-subnet-group-${random_string.suffix.result}"
  subnet_ids = [for subnet in aws_default_subnet.default : subnet.id]

  tags = {
    Name        = "Visitor Sign-In PostgreSQL Subnet Group"
    Environment = var.environment
  }
}

# Create default subnets in available AZs
resource "aws_default_subnet" "default" {
  count             = 2
  availability_zone = data.aws_availability_zones.available.names[count.index]
}

# Create Aurora PostgreSQL Cluster
resource "aws_rds_cluster" "postgres" {
  cluster_identifier      = "visitor-sign-in-postgres-${random_string.suffix.result}"
  engine                  = "aurora-postgresql"
  engine_mode             = "provisioned"
  engine_version          = "13.6"
  database_name           = var.db_name
  master_username         = var.db_username
  master_password         = var.db_password
  backup_retention_period = 7
  preferred_backup_window = "07:00-09:00"
  skip_final_snapshot     = true
  db_subnet_group_name    = aws_db_subnet_group.postgres.name
  vpc_security_group_ids  = [aws_security_group.postgres.id]
  
  # For development environments, can be removed for production
  apply_immediately       = true
  
  tags = {
    Name        = "Visitor Sign-In PostgreSQL Cluster"
    Environment = var.environment
  }
}

# Create Aurora PostgreSQL Cluster Instances
resource "aws_rds_cluster_instance" "postgres" {
  count                = 1  # Single instance for dev/test, increase for production
  identifier           = "visitor-sign-in-postgres-${count.index}-${random_string.suffix.result}"
  cluster_identifier   = aws_rds_cluster.postgres.id
  instance_class       = var.db_instance_class
  engine               = "aurora-postgresql"
  engine_version       = "13.6"
  db_subnet_group_name = aws_db_subnet_group.postgres.name
  
  tags = {
    Name        = "Visitor Sign-In PostgreSQL Instance ${count.index}"
    Environment = var.environment
  }
}
