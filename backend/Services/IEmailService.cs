namespace EstateFlow.Api.Services;

public interface IEmailService
{
    Task SendMagicLinkEmailAsync(string toEmail, string magicLinkUrl);
    Task SendNewDealEmailAsync(string toEmail, string clientName, string dealUrl, string agentName);
    Task SendStepUpdateEmailAsync(string toEmail, string clientName, string stepTitle, string stepStatus, string dealUrl);
    Task SendNewDocumentEmailAsync(string toEmail, string clientName, string documentName, string dealUrl);
}
