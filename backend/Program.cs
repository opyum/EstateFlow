using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using EstateFlow.Api.Data;
using EstateFlow.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database
var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? "Host=localhost;Port=5432;Database=estateflow;Username=estateflow;Password=estateflow_dev_password";
builder.Services.AddDbContext<EstateFlowDbContext>(options =>
    options.UseNpgsql(connectionString));

// JWT Authentication
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? "default_dev_secret_key_minimum_32_chars!!";
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "estateflow";
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "estateflow";

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

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
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

static async Task ApplySchemaUpdates(EstateFlowDbContext db)
{
    var connection = db.Database.GetDbConnection();
    await connection.OpenAsync();

    try
    {
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
            var checkCmd = connection.CreateCommand();
            checkCmd.CommandText = $@"
                SELECT COUNT(*) FROM information_schema.columns
                WHERE table_name = 'documents' AND column_name = '{columnName}'";

            var exists = Convert.ToInt32(await checkCmd.ExecuteScalarAsync()) > 0;

            if (!exists)
            {
                var addCmd = connection.CreateCommand();
                addCmd.CommandText = $"ALTER TABLE documents ADD COLUMN {columnName} {columnType}";
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
                var checkCmd = connection.CreateCommand();
                checkCmd.CommandText = $@"
                    SELECT COUNT(*) FROM information_schema.columns
                    WHERE table_name = 'deal_views' AND column_name = '{columnName}'";

                var exists = Convert.ToInt32(await checkCmd.ExecuteScalarAsync()) > 0;

                if (!exists)
                {
                    var addCmd = connection.CreateCommand();
                    addCmd.CommandText = $"ALTER TABLE deal_views ADD COLUMN {columnName} {columnType}";
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

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

app.Run();
public partial class Program { }
