# IAM Role for Lambda functions
resource "aws_iam_role" "lambda_role" {
  name = "visitor-sign-in-lambda-role-${random_string.suffix.result}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Attach RDS access policy
resource "aws_iam_policy" "lambda_rds_access" {
  name        = "visitor-sign-in-lambda-rds-access-${random_string.suffix.result}"
  description = "Allow Lambda functions to access RDS"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "rds:Connect",
          "rds:Query"
        ],
        Effect   = "Allow",
        Resource = aws_rds_cluster.postgres.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_rds_access" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_rds_access.arn
}

# Lambda functions

# Register Visitor Lambda
resource "aws_lambda_function" "register_visitor" {
  function_name = "visitor-sign-in-register-visitor-${random_string.suffix.result}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs16.x"
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/../lambda-functions/register-visitor.zip"
  source_code_hash = filebase64sha256("${path.module}/../lambda-functions/register-visitor.zip")

  environment {
    variables = {
      PGHOST     = aws_rds_cluster.postgres.endpoint
      PGPORT     = aws_rds_cluster.postgres.port
      PGDATABASE = aws_rds_cluster.postgres.database_name
      PGUSER     = var.db_username
      PGPASSWORD = var.db_password
    }
  }

  tags = {
    Name        = "Visitor Sign-In Register Lambda"
    Environment = var.environment
  }
}

# Get Event Lambda
resource "aws_lambda_function" "get_event" {
  function_name = "visitor-sign-in-get-event-${random_string.suffix.result}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs16.x"
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/../lambda-functions/get-event.zip"
  source_code_hash = filebase64sha256("${path.module}/../lambda-functions/get-event.zip")

  environment {
    variables = {
      PGHOST     = aws_rds_cluster.postgres.endpoint
      PGPORT     = aws_rds_cluster.postgres.port
      PGDATABASE = aws_rds_cluster.postgres.database_name
      PGUSER     = var.db_username
      PGPASSWORD = var.db_password
    }
  }

  tags = {
    Name        = "Visitor Sign-In Get Event Lambda"
    Environment = var.environment
  }
}

# Enable Event Lambda
resource "aws_lambda_function" "enable_event" {
  function_name = "visitor-sign-in-enable-event-${random_string.suffix.result}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs16.x"
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/../lambda-functions/enable-event.zip"
  source_code_hash = filebase64sha256("${path.module}/../lambda-functions/enable-event.zip")

  environment {
    variables = {
      PGHOST     = aws_rds_cluster.postgres.endpoint
      PGPORT     = aws_rds_cluster.postgres.port
      PGDATABASE = aws_rds_cluster.postgres.database_name
      PGUSER     = var.db_username
      PGPASSWORD = var.db_password
    }
  }

  tags = {
    Name        = "Visitor Sign-In Enable Event Lambda"
    Environment = var.environment
  }
}

# Disable Event Lambda
resource "aws_lambda_function" "disable_event" {
  function_name = "visitor-sign-in-disable-event-${random_string.suffix.result}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs16.x"
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/../lambda-functions/disable-event.zip"
  source_code_hash = filebase64sha256("${path.module}/../lambda-functions/disable-event.zip")

  environment {
    variables = {
      PGHOST     = aws_rds_cluster.postgres.endpoint
      PGPORT     = aws_rds_cluster.postgres.port
      PGDATABASE = aws_rds_cluster.postgres.database_name
      PGUSER     = var.db_username
      PGPASSWORD = var.db_password
    }
  }

  tags = {
    Name        = "Visitor Sign-In Disable Event Lambda"
    Environment = var.environment
  }
}

# Get Visitors Lambda
resource "aws_lambda_function" "get_visitors" {
  function_name = "visitor-sign-in-get-visitors-${random_string.suffix.result}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs16.x"
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/../lambda-functions/get-visitors.zip"
  source_code_hash = filebase64sha256("${path.module}/../lambda-functions/get-visitors.zip")

  environment {
    variables = {
      PGHOST     = aws_rds_cluster.postgres.endpoint
      PGPORT     = aws_rds_cluster.postgres.port
      PGDATABASE = aws_rds_cluster.postgres.database_name
      PGUSER     = var.db_username
      PGPASSWORD = var.db_password
    }
  }

  tags = {
    Name        = "Visitor Sign-In Get Visitors Lambda"
    Environment = var.environment
  }
}

# Login Lambda
resource "aws_lambda_function" "login" {
  function_name = "visitor-sign-in-login-${random_string.suffix.result}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs16.x"
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/../lambda-functions/login.zip"
  source_code_hash = filebase64sha256("${path.module}/../lambda-functions/login.zip")

  environment {
    variables = {
      PGHOST     = aws_rds_cluster.postgres.endpoint
      PGPORT     = aws_rds_cluster.postgres.port
      PGDATABASE = aws_rds_cluster.postgres.database_name
      PGUSER     = var.db_username
      PGPASSWORD = var.db_password
      JWT_SECRET = var.jwt_secret
    }
  }

  tags = {
    Name        = "Visitor Sign-In Login Lambda"
    Environment = var.environment
  }
}

# Register User Lambda
resource "aws_lambda_function" "register_user" {
  function_name = "visitor-sign-in-register-user-${random_string.suffix.result}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs16.x"
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/../lambda-functions/register-user.zip"
  source_code_hash = filebase64sha256("${path.module}/../lambda-functions/register-user.zip")

  environment {
    variables = {
      PGHOST     = aws_rds_cluster.postgres.endpoint
      PGPORT     = aws_rds_cluster.postgres.port
      PGDATABASE = aws_rds_cluster.postgres.database_name
      PGUSER     = var.db_username
      PGPASSWORD = var.db_password
      JWT_SECRET = var.jwt_secret
    }
  }

  tags = {
    Name        = "Visitor Sign-In Register User Lambda"
    Environment = var.environment
  }
}

# Initialize Database Lambda
resource "aws_lambda_function" "init_database" {
  function_name = "visitor-sign-in-init-database-${random_string.suffix.result}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs16.x"
  timeout       = 60  # Longer timeout for DB initialization
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/../lambda-functions/init-database.zip"
  source_code_hash = filebase64sha256("${path.module}/../lambda-functions/init-database.zip")

  environment {
    variables = {
      PGHOST     = aws_rds_cluster.postgres.endpoint
      PGPORT     = aws_rds_cluster.postgres.port
      PGDATABASE = aws_rds_cluster.postgres.database_name
      PGUSER     = var.db_username
      PGPASSWORD = var.db_password
    }
  }

  tags = {
    Name        = "Visitor Sign-In Init Database Lambda"
    Environment = var.environment
  }
}

# DB Init Trigger (run once after deployment)
resource "aws_cloudwatch_event_rule" "db_init_trigger" {
  name                = "visitor-sign-in-db-init-trigger-${random_string.suffix.result}"
  description         = "Trigger database initialization after deployment"
  schedule_expression = "rate(999 days)"  # Practically never, we'll use Lambda console
}

resource "aws_cloudwatch_event_target" "db_init_target" {
  rule      = aws_cloudwatch_event_rule.db_init_trigger.name
  target_id = "InitDatabaseLambda"
  arn       = aws_lambda_function.init_database.arn
}

resource "aws_lambda_permission" "allow_cloudwatch_to_call_init_db" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.init_database.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.db_init_trigger.arn
}
