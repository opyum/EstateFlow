using System.Net;
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

    // ========== SECURITY: HTML escape user input to prevent XSS ==========
    private static string HtmlEncode(string input) => WebUtility.HtmlEncode(input ?? "");

    // ========== SECURITY: Validate and encode URLs ==========
    private static string SafeUrl(string url)
    {
        if (string.IsNullOrEmpty(url)) return "#";
        // Only allow http/https URLs
        if (!url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            return "#";
        return HtmlEncode(url);
    }

    public async Task SendMagicLinkEmailAsync(string toEmail, string magicLinkUrl)
    {
        var safeUrl = SafeUrl(magicLinkUrl);
        var subject = "Connectez-vous à EstateFlow";
        var html = $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <h1 style='color: #1a1a2e;'>EstateFlow</h1>
                <p>Bonjour,</p>
                <p>Cliquez sur le bouton ci-dessous pour vous connecter à votre espace agent :</p>
                <p style='text-align: center; margin: 30px 0;'>
                    <a href='{safeUrl}'
                       style='background-color: #1a1a2e; color: white; padding: 12px 30px;
                              text-decoration: none; border-radius: 5px; display: inline-block;'>
                        Se connecter
                    </a>
                </p>
                <p style='color: #666; font-size: 14px;'>
                    Ce lien expire dans 15 minutes. Si vous n'avez pas demandé cette connexion, ignorez cet email.
                </p>
            </div>";

        await SendEmailAsync(toEmail, subject, html);
    }

    public async Task SendNewDealEmailAsync(string toEmail, string clientName, string dealUrl, string agentName)
    {
        var safeClientName = HtmlEncode(clientName);
        var safeAgentName = HtmlEncode(agentName);
        var safeUrl = SafeUrl(dealUrl);

        var subject = $"Bienvenue ! Suivez votre acquisition avec {safeAgentName}";
        var html = $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <h1 style='color: #1a1a2e;'>Votre espace de suivi</h1>
                <p>Bonjour {safeClientName},</p>
                <p>{safeAgentName} vous invite à suivre l'avancement de votre transaction immobilière.</p>
                <p style='text-align: center; margin: 30px 0;'>
                    <a href='{safeUrl}'
                       style='background-color: #1a1a2e; color: white; padding: 12px 30px;
                              text-decoration: none; border-radius: 5px; display: inline-block;'>
                        Accéder à mon dossier
                    </a>
                </p>
                <p style='color: #666; font-size: 14px;'>
                    Conservez ce lien précieusement, il vous permettra d'accéder à tout moment à votre dossier.
                </p>
            </div>";

        await SendEmailAsync(toEmail, subject, html);
    }

    public async Task SendStepUpdateEmailAsync(string toEmail, string clientName, string stepTitle, string stepStatus, string dealUrl)
    {
        var safeClientName = HtmlEncode(clientName);
        var safeStepTitle = HtmlEncode(stepTitle);
        var safeStepStatus = HtmlEncode(stepStatus);
        var safeUrl = SafeUrl(dealUrl);

        var subject = $"Mise à jour : {safeStepTitle}";
        var html = $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <h1 style='color: #1a1a2e;'>Mise à jour de votre dossier</h1>
                <p>Bonjour {safeClientName},</p>
                <p>Une étape de votre dossier a été mise à jour :</p>
                <div style='background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;'>
                    <strong>{safeStepTitle}</strong><br/>
                    Statut : {safeStepStatus}
                </div>
                <p style='text-align: center; margin: 30px 0;'>
                    <a href='{safeUrl}'
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
        var safeClientName = HtmlEncode(clientName);
        var safeDocumentName = HtmlEncode(documentName);
        var safeUrl = SafeUrl(dealUrl);

        var subject = "Nouveau document disponible";
        var html = $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <h1 style='color: #1a1a2e;'>Nouveau document</h1>
                <p>Bonjour {safeClientName},</p>
                <p>Un nouveau document a été ajouté à votre dossier :</p>
                <div style='background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;'>
                    <strong>{safeDocumentName}</strong>
                </div>
                <p style='text-align: center; margin: 30px 0;'>
                    <a href='{safeUrl}'
                       style='background-color: #1a1a2e; color: white; padding: 12px 30px;
                              text-decoration: none; border-radius: 5px; display: inline-block;'>
                        Voir le document
                    </a>
                </p>
            </div>";

        await SendEmailAsync(toEmail, subject, html);
    }

    public async Task SendInvitationEmailAsync(string toEmail, string organizationName, string role, string inviteUrl)
    {
        if (string.IsNullOrEmpty(_apiKey) || !_apiKey.StartsWith("re_"))
        {
            Console.WriteLine($"[DEV] Invitation email to {toEmail}:");
            Console.WriteLine($"      Organization: {organizationName}");
            Console.WriteLine($"      Role: {role}");
            Console.WriteLine($"      Link: {inviteUrl}");
            return;
        }

        var safeOrgName = HtmlEncode(organizationName);
        var safeRole = HtmlEncode(role);
        var safeUrl = SafeUrl(inviteUrl);

        var subject = $"Invitation to join {safeOrgName} on EstateFlow";
        var html = $@"
            <div style='font-family: sans-serif; max-width: 600px; margin: 0 auto;'>
                <h2>You're invited!</h2>
                <p>You've been invited to join <strong>{safeOrgName}</strong> on EstateFlow as a <strong>{safeRole}</strong>.</p>
                <p style='margin: 30px 0;'>
                    <a href='{safeUrl}' style='background: #1a1a2e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;'>
                        Accept Invitation
                    </a>
                </p>
                <p style='color: #666; font-size: 14px;'>This invitation expires in 7 days.</p>
            </div>
        ";

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
