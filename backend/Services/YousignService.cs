using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace EstateFlow.Api.Services;

public class YousignService : IYousignService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiUrl;
    private readonly ILogger<YousignService> _logger;

    public YousignService(IConfiguration configuration, ILogger<YousignService> logger)
    {
        _logger = logger;
        _apiUrl = configuration["YOUSIGN_API_URL"] ?? "https://api-sandbox.yousign.app/v3";
        var apiKey = configuration["YOUSIGN_API_KEY"] ?? throw new InvalidOperationException("YOUSIGN_API_KEY not configured");

        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    public async Task<SignatureRequestResult> CreateSignatureRequestAsync(
        string filePath,
        string signerEmail,
        string signerName,
        string documentName)
    {
        // Step 1: Create signature request
        var createRequest = new
        {
            name = $"Signature: {documentName}",
            delivery_mode = "email",
            timezone = "Europe/Paris"
        };

        var createResponse = await _httpClient.PostAsync(
            $"{_apiUrl}/signature_requests",
            new StringContent(JsonSerializer.Serialize(createRequest), Encoding.UTF8, "application/json")
        );
        createResponse.EnsureSuccessStatusCode();

        var createResult = await JsonSerializer.DeserializeAsync<YousignSignatureRequest>(
            await createResponse.Content.ReadAsStreamAsync()
        );
        var signatureRequestId = createResult!.Id;

        // Step 2: Upload document
        var fileBytes = await File.ReadAllBytesAsync(filePath);
        var fileContent = new ByteArrayContent(fileBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");

        using var formData = new MultipartFormDataContent();
        formData.Add(fileContent, "file", Path.GetFileName(filePath));
        formData.Add(new StringContent("signable_document"), "nature");

        var uploadResponse = await _httpClient.PostAsync(
            $"{_apiUrl}/signature_requests/{signatureRequestId}/documents",
            formData
        );
        uploadResponse.EnsureSuccessStatusCode();

        var uploadResult = await JsonSerializer.DeserializeAsync<YousignDocument>(
            await uploadResponse.Content.ReadAsStreamAsync()
        );
        var documentId = uploadResult!.Id;

        // Step 3: Add signer
        var signerRequest = new
        {
            info = new
            {
                first_name = signerName.Split(' ').FirstOrDefault() ?? signerName,
                last_name = signerName.Split(' ').Skip(1).FirstOrDefault() ?? "",
                email = signerEmail,
                locale = "fr"
            },
            signature_level = "electronic_signature",
            signature_authentication_mode = "no_otp",
            fields = new[]
            {
                new
                {
                    type = "signature",
                    document_id = documentId,
                    page = 1,
                    x = 100,
                    y = 700,
                    width = 200,
                    height = 50
                }
            }
        };

        var signerResponse = await _httpClient.PostAsync(
            $"{_apiUrl}/signature_requests/{signatureRequestId}/signers",
            new StringContent(JsonSerializer.Serialize(signerRequest), Encoding.UTF8, "application/json")
        );
        signerResponse.EnsureSuccessStatusCode();

        var signerResult = await JsonSerializer.DeserializeAsync<YousignSigner>(
            await signerResponse.Content.ReadAsStreamAsync()
        );

        // Step 4: Activate signature request
        var activateResponse = await _httpClient.PostAsync(
            $"{_apiUrl}/signature_requests/{signatureRequestId}/activate",
            null
        );
        activateResponse.EnsureSuccessStatusCode();

        return new SignatureRequestResult(
            signatureRequestId,
            signerResult!.SignatureLink ?? "",
            "ongoing"
        );
    }

    public async Task<SignatureStatus> GetSignatureStatusAsync(string signatureRequestId)
    {
        var response = await _httpClient.GetAsync($"{_apiUrl}/signature_requests/{signatureRequestId}");
        response.EnsureSuccessStatusCode();

        var result = await JsonSerializer.DeserializeAsync<YousignSignatureRequest>(
            await response.Content.ReadAsStreamAsync()
        );

        return new SignatureStatus(
            result!.Status,
            result.Status == "done" ? DateTime.UtcNow : null
        );
    }

    public async Task<byte[]> DownloadSignedDocumentAsync(string signatureRequestId)
    {
        var response = await _httpClient.GetAsync(
            $"{_apiUrl}/signature_requests/{signatureRequestId}/documents/download"
        );
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsByteArrayAsync();
    }

    // DTOs for Yousign API responses
    private class YousignSignatureRequest
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = "";

        [JsonPropertyName("status")]
        public string Status { get; set; } = "";
    }

    private class YousignDocument
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = "";
    }

    private class YousignSigner
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = "";

        [JsonPropertyName("signature_link")]
        public string? SignatureLink { get; set; }
    }
}
