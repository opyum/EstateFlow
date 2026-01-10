using EstateFlow.Api.Data.Entities;

namespace EstateFlow.Api.Services;

public interface IAuthService
{
    Task<string> GenerateMagicLinkAsync(string email);
    Task<string?> ValidateMagicLinkAsync(string token);
    string GenerateJwtToken(Guid agentId, string email, Guid? organizationId = null, Role? role = null);
    string GenerateAccessToken();
}
