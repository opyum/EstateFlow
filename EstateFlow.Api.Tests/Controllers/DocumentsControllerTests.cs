using Xunit;
using Microsoft.AspNetCore.Mvc.Testing;
using System.Net;
using System.Net.Http.Headers;

namespace EstateFlow.Api.Tests.Controllers;

public class DocumentsControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public DocumentsControllerTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Upload_WithoutAuth_Returns401()
    {
        // Arrange
        var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(new byte[] { 1, 2, 3 }), "file", "test.pdf");
        content.Add(new StringContent("Reference"), "category");

        // Act
        var response = await _client.PostAsync(
            "/api/deals/00000000-0000-0000-0000-000000000001/documents",
            content
        );

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Download_WithoutAuth_Returns401()
    {
        var response = await _client.GetAsync(
            "/api/deals/00000000-0000-0000-0000-000000000001/documents/00000000-0000-0000-0000-000000000002/download"
        );

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
