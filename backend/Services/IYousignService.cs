namespace EstateFlow.Api.Services;

public interface IYousignService
{
    Task<SignatureRequestResult> CreateSignatureRequestAsync(
        string filePath,
        string signerEmail,
        string signerName,
        string documentName
    );

    Task<SignatureStatus> GetSignatureStatusAsync(string signatureRequestId);

    Task<byte[]> DownloadSignedDocumentAsync(string signatureRequestId);
}

public record SignatureRequestResult(
    string SignatureRequestId,
    string SignerUrl,
    string Status
);

public record SignatureStatus(
    string Status,
    DateTime? SignedAt
);
