namespace EstateFlow.Api.Services;

public interface IAuthService
{
    Task<string> GenerateMagicLinkAsync(string email);
    Task<string?> ValidateMagicLinkAsync(string token);
    string GenerateJwtToken(Guid agentId, string email);
    string GenerateAccessToken();
}
