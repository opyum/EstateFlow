using Xunit;
using Microsoft.AspNetCore.Mvc.Testing;
using System.Net;

namespace EstateFlow.Api.Tests.Controllers;

public class AnalyticsControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public AnalyticsControllerTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetAnalytics_WithoutAuth_Returns401()
    {
        var response = await _client.GetAsync(
            "/api/deals/00000000-0000-0000-0000-000000000001/analytics"
        );

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
