using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using EstateFlow.Api.Data;
using EstateFlow.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ========== SECURITY: Validate required environment variables ==========
var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL");
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET");
var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL");

// In development, allow defaults; in production, require all secrets
if (!builder.Environment.IsDevelopment())
{
    if (string.IsNullOrEmpty(connectionString))
        throw new InvalidOperationException("DATABASE_URL environment variable is required in production");
    if (string.IsNullOrEmpty(jwtSecret) || jwtSecret.Length < 32)
        throw new InvalidOperationException("JWT_SECRET environment variable (min 32 chars) is required in production");
    if (string.IsNullOrEmpty(frontendUrl))
        throw new InvalidOperationException("FRONTEND_URL environment variable is required in production");
}

// Development fallbacks (only used when ASPNETCORE_ENVIRONMENT=Development)
connectionString ??= "Host=localhost;Port=5432;Database=estateflow;Username=estateflow;Password=estateflow_dev_password";
jwtSecret ??= "default_dev_secret_key_minimum_32_chars!!";
frontendUrl ??= "http://localhost:3000";

var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "estateflow";
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "estateflow";

// Database
builder.Services.AddDbContext<EstateFlowDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization();

// Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddSingleton<IYousignService, YousignService>();
builder.Services.AddScoped<IMigrationService, MigrationService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IOrganizationContextService, OrganizationContextService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();

// ========== SECURITY: Rate Limiting ==========
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Global rate limit
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1)
            }));

    // Strict rate limit for auth endpoints
    options.AddPolicy("auth", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

// ========== SECURITY: Restrictive CORS ==========
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(frontendUrl)
              .WithHeaders("Content-Type", "Authorization", "X-Requested-With")
              .WithMethods("GET", "POST", "PUT", "DELETE")
              .AllowCredentials();
    });
});

var app = builder.Build();

// Create database schema on startup and apply schema updates
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<EstateFlowDbContext>();
    db.Database.EnsureCreated();

    // Apply schema updates for existing databases
    await ApplySchemaUpdates(db);
}

// Run data migration
using (var scope = app.Services.CreateScope())
{
    var migrationService = scope.ServiceProvider.GetRequiredService<IMigrationService>();
    await migrationService.MigrateAgentsToOrganizationsAsync();
}

static async Task ApplySchemaUpdates(EstateFlowDbContext db)
{
    var connection = db.Database.GetDbConnection();
    await connection.OpenAsync();

    try
    {
        // ========== Create multi-tenant tables if they don't exist ==========

        // Create organizations table
        var createOrgsCmd = connection.CreateCommand();
        createOrgsCmd.CommandText = @"
            CREATE TABLE IF NOT EXISTS organizations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                brand_color VARCHAR(50),
                logo_url VARCHAR(500),
                stripe_customer_id VARCHAR(255),
                stripe_subscription_id VARCHAR(255),
                stripe_seat_item_id VARCHAR(255),
                subscription_status VARCHAR(50) NOT NULL DEFAULT 'Trial',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )";
        await createOrgsCmd.ExecuteNonQueryAsync();
        Console.WriteLine("Ensured organizations table exists");

        // Create organization_members table
        var createMembersCmd = connection.CreateCommand();
        createMembersCmd.CommandText = @"
            CREATE TABLE IF NOT EXISTS organization_members (
                organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
                role VARCHAR(50) NOT NULL DEFAULT 'Admin',
                joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (organization_id, agent_id)
            )";
        await createMembersCmd.ExecuteNonQueryAsync();
        Console.WriteLine("Ensured organization_members table exists");

        // Create invitations table
        var createInvitesCmd = connection.CreateCommand();
        createInvitesCmd.CommandText = @"
            CREATE TABLE IF NOT EXISTS invitations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                email VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'Employee',
                token VARCHAR(255) NOT NULL UNIQUE,
                stripe_subscription_item_id VARCHAR(255),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                accepted_at TIMESTAMP
            )";
        await createInvitesCmd.ExecuteNonQueryAsync();
        Console.WriteLine("Ensured invitations table exists");

        // Add multi-tenant columns to deals table
        var dealColumns = new[]
        {
            ("organization_id", "UUID"),
            ("assigned_to_agent_id", "UUID"),
            ("created_by_agent_id", "UUID")
        };

        foreach (var (columnName, columnType) in dealColumns)
        {
            var checkCmd = connection.CreateCommand();
            checkCmd.CommandText = @"
                SELECT COUNT(*) FROM information_schema.columns
                WHERE table_name = 'deals' AND column_name = @columnName";

            var columnParam = checkCmd.CreateParameter();
            columnParam.ParameterName = "@columnName";
            columnParam.Value = columnName;
            checkCmd.Parameters.Add(columnParam);

            var exists = Convert.ToInt32(await checkCmd.ExecuteScalarAsync()) > 0;

            if (!exists)
            {
                var addCmd = connection.CreateCommand();
                addCmd.CommandText = $"ALTER TABLE deals ADD COLUMN \"{columnName}\" {columnType}";
                await addCmd.ExecuteNonQueryAsync();
                Console.WriteLine($"Added missing column to deals: {columnName}");
            }
        }

        // ========== SECURITY: Whitelist of allowed column names to prevent SQL injection ==========
        var allowedColumns = new HashSet<string>
        {
            "signature_request_id", "signature_status", "signed_file_path", "signed_at",
            "document_id", "downloaded"
        };

        var allowedTypes = new HashSet<string>
        {
            "VARCHAR(100)", "VARCHAR(50)", "VARCHAR(500)", "TIMESTAMP", "UUID", "BOOLEAN DEFAULT FALSE"
        };

        // Check and add missing columns to documents table
        var columnsToAdd = new[]
        {
            ("signature_request_id", "VARCHAR(100)"),
            ("signature_status", "VARCHAR(50)"),
            ("signed_file_path", "VARCHAR(500)"),
            ("signed_at", "TIMESTAMP")
        };

        foreach (var (columnName, columnType) in columnsToAdd)
        {
            // Validate against whitelist
            if (!allowedColumns.Contains(columnName) || !allowedTypes.Contains(columnType))
            {
                Console.WriteLine($"Skipping invalid column: {columnName}");
                continue;
            }

            var checkCmd = connection.CreateCommand();
            checkCmd.CommandText = @"
                SELECT COUNT(*) FROM information_schema.columns
                WHERE table_name = @tableName AND column_name = @columnName";

            var tableParam = checkCmd.CreateParameter();
            tableParam.ParameterName = "@tableName";
            tableParam.Value = "documents";
            checkCmd.Parameters.Add(tableParam);

            var columnParam = checkCmd.CreateParameter();
            columnParam.ParameterName = "@columnName";
            columnParam.Value = columnName;
            checkCmd.Parameters.Add(columnParam);

            var exists = Convert.ToInt32(await checkCmd.ExecuteScalarAsync()) > 0;

            if (!exists)
            {
                // Column names must be quoted identifiers for safety
                var addCmd = connection.CreateCommand();
                addCmd.CommandText = $"ALTER TABLE documents ADD COLUMN \"{columnName}\" {columnType}";
                await addCmd.ExecuteNonQueryAsync();
                Console.WriteLine($"Added missing column: {columnName}");
            }
        }

        // Check and add missing columns to deal_views table
        var dealViewColumns = new[]
        {
            ("document_id", "UUID"),
            ("downloaded", "BOOLEAN DEFAULT FALSE")
        };

        // First check if deal_views table exists
        var tableCheckCmd = connection.CreateCommand();
        tableCheckCmd.CommandText = @"
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_name = 'deal_views'";
        var tableExists = Convert.ToInt32(await tableCheckCmd.ExecuteScalarAsync()) > 0;

        if (tableExists)
        {
            foreach (var (columnName, columnType) in dealViewColumns)
            {
                // Validate against whitelist
                if (!allowedColumns.Contains(columnName) || !allowedTypes.Contains(columnType))
                {
                    Console.WriteLine($"Skipping invalid column: {columnName}");
                    continue;
                }

                var checkCmd = connection.CreateCommand();
                checkCmd.CommandText = @"
                    SELECT COUNT(*) FROM information_schema.columns
                    WHERE table_name = @tableName AND column_name = @columnName";

                var tableParam = checkCmd.CreateParameter();
                tableParam.ParameterName = "@tableName";
                tableParam.Value = "deal_views";
                checkCmd.Parameters.Add(tableParam);

                var columnParam = checkCmd.CreateParameter();
                columnParam.ParameterName = "@columnName";
                columnParam.Value = columnName;
                checkCmd.Parameters.Add(columnParam);

                var exists = Convert.ToInt32(await checkCmd.ExecuteScalarAsync()) > 0;

                if (!exists)
                {
                    var addCmd = connection.CreateCommand();
                    addCmd.CommandText = $"ALTER TABLE deal_views ADD COLUMN \"{columnName}\" {columnType}";
                    await addCmd.ExecuteNonQueryAsync();
                    Console.WriteLine($"Added missing column to deal_views: {columnName}");
                }
            }
        }
    }
    finally
    {
        await connection.CloseAsync();
    }
}

// Configure pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ========== SECURITY: Add security headers ==========
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    context.Response.Headers.Append("Permissions-Policy", "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()");

    if (!app.Environment.IsDevelopment())
    {
        context.Response.Headers.Append("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    await next();
});

app.UseRateLimiter();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

await app.RunAsync();
public partial class Program { }
