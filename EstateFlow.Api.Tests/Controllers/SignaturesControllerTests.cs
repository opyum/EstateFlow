using Xunit;
using Microsoft.AspNetCore.Mvc.Testing;
using System.Net;

namespace EstateFlow.Api.Tests.Controllers;

public class SignaturesControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public SignaturesControllerTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task RequestSignature_WithoutAuth_Returns401()
    {
        var response = await _client.PostAsync(
            "/api/deals/00000000-0000-0000-0000-000000000001/documents/00000000-0000-0000-0000-000000000002/signature/request",
            null
        );

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetSignatureStatus_WithoutAuth_Returns401()
    {
        var response = await _client.GetAsync(
            "/api/deals/00000000-0000-0000-0000-000000000001/documents/00000000-0000-0000-0000-000000000002/signature/status"
        );

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
