using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace EstateFlow.Api.Services;

public class EmailService : IEmailService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _fromEmail;
    private readonly ILogger<EmailService> _logger;

    public EmailService(ILogger<EmailService> logger)
    {
        _logger = logger;
        _httpClient = new HttpClient();
        _apiKey = Environment.GetEnvironmentVariable("RESEND_API_KEY") ?? "";
        _fromEmail = Environment.GetEnvironmentVariable("EMAIL_FROM") ?? "noreply@estateflow.com";
    }

    public async Task SendMagicLinkEmailAsync(string toEmail, string magicLinkUrl)
    {
        var subject = "Connectez-vous a EstateFlow";
        var html = $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <h1 style='color: #1a1a2e;'>EstateFlow</h1>
                <p>Bonjour,</p>
                <p>Cliquez sur le bouton ci-dessous pour vous connecter a votre espace agent :</p>
                <p style='text-align: center; margin: 30px 0;'>
                    <a href='{magicLinkUrl}'
                       style='background-color: #1a1a2e; color: white; padding: 12px 30px;
                              text-decoration: none; border-radius: 5px; display: inline-block;'>
                        Se connecter
                    </a>
                </p>
                <p style='color: #666; font-size: 14px;'>
                    Ce lien expire dans 15 minutes. Si vous n'avez pas demande cette connexion, ignorez cet email.
                </p>
            </div>";

        await SendEmailAsync(toEmail, subject, html);
    }

    public async Task SendNewDealEmailAsync(string toEmail, string clientName, string dealUrl, string agentName)
    {
        var subject = $"Bienvenue ! Suivez votre acquisition avec {agentName}";
        var html = $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <h1 style='color: #1a1a2e;'>Votre espace de suivi</h1>
                <p>Bonjour {clientName},</p>
                <p>{agentName} vous invite a suivre l'avancement de votre transaction immobiliere.</p>
                <p style='text-align: center; margin: 30px 0;'>
                    <a href='{dealUrl}'
                       style='background-color: #1a1a2e; color: white; padding: 12px 30px;
                              text-decoration: none; border-radius: 5px; display: inline-block;'>
                        Acceder a mon dossier
                    </a>
                </p>
                <p style='color: #666; font-size: 14px;'>
                    Conservez ce lien precieusement, il vous permettra d'acceder a tout moment a votre dossier.
                </p>
            </div>";

        await SendEmailAsync(toEmail, subject, html);
    }

    public async Task SendStepUpdateEmailAsync(string toEmail, string clientName, string stepTitle, string stepStatus, string dealUrl)
    {
        var subject = $"Mise a jour : {stepTitle}";
        var html = $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <h1 style='color: #1a1a2e;'>Mise a jour de votre dossier</h1>
                <p>Bonjour {clientName},</p>
                <p>Une etape de votre dossier a ete mise a jour :</p>
                <div style='background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;'>
                    <strong>{stepTitle}</strong><br/>
                    Statut : {stepStatus}
                </div>
                <p style='text-align: center; margin: 30px 0;'>
                    <a href='{dealUrl}'
                       style='background-color: #1a1a2e; color: white; padding: 12px 30px;
                              text-decoration: none; border-radius: 5px; display: inline-block;'>
                        Voir mon dossier
                    </a>
                </p>
            </div>";

        await SendEmailAsync(toEmail, subject, html);
    }

    public async Task SendNewDocumentEmailAsync(string toEmail, string clientName, string documentName, string dealUrl)
    {
        var subject = "Nouveau document disponible";
        var html = $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <h1 style='color: #1a1a2e;'>Nouveau document</h1>
                <p>Bonjour {clientName},</p>
                <p>Un nouveau document a ete ajoute a votre dossier :</p>
                <div style='background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;'>
                    <strong>{documentName}</strong>
                </div>
                <p style='text-align: center; margin: 30px 0;'>
                    <a href='{dealUrl}'
                       style='background-color: #1a1a2e; color: white; padding: 12px 30px;
                              text-decoration: none; border-radius: 5px; display: inline-block;'>
                        Voir le document
                    </a>
                </p>
            </div>";

        await SendEmailAsync(toEmail, subject, html);
    }

    private async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
        if (string.IsNullOrEmpty(_apiKey) || _apiKey.StartsWith("re_xxxxx"))
        {
            _logger.LogWarning("Resend API key not configured. Email would be sent to {Email}: {Subject}", toEmail, subject);
            return;
        }

        try
        {
            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

            var payload = new
            {
                from = _fromEmail,
                to = new[] { toEmail },
                subject = subject,
                html = htmlBody
            };

            request.Content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json"
            );

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to send email: {Error}", error);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending email to {Email}", toEmail);
        }
    }
}
