variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "db_username" {
  description = "Username for PostgreSQL database"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Password for PostgreSQL database"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Secret key for JWT token generation"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "Name of the PostgreSQL database"
  type        = string
  default     = "visitor_sign_in"
}

variable "db_instance_class" {
  description = "Instance class for the Aurora PostgreSQL cluster"
  type        = string
  default     = "db.t3.small"
}

variable "lambda_memory_size" {
  description = "Memory size for Lambda functions (in MB)"
  type        = number
  default     = 256
}

variable "lambda_timeout" {
  description = "Timeout for Lambda functions (in seconds)"
  type        = number
  default     = 30
}
