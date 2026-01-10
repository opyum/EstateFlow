using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;
using EstateFlow.Api.Data;
using EstateFlow.Api.Data.Entities;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StripeController : ControllerBase
{
    private readonly EstateFlowDbContext _context;
    private readonly ILogger<StripeController> _logger;
    private readonly string _stripeSecretKey;
    private readonly string _stripeWebhookSecret;
    private readonly string _stripePriceIdMonthly;
    private readonly string _stripePriceIdYearly;
    private readonly string _frontendUrl;

    private readonly string _stripeSeatPriceId;

    public StripeController(EstateFlowDbContext context, ILogger<StripeController> logger)
    {
        _context = context;
        _logger = logger;
        _stripeSecretKey = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY") ?? "";
        _stripeWebhookSecret = Environment.GetEnvironmentVariable("STRIPE_WEBHOOK_SECRET") ?? "";
        _stripePriceIdMonthly = Environment.GetEnvironmentVariable("STRIPE_PRICE_ID_MONTHLY") ?? "";
        _stripePriceIdYearly = Environment.GetEnvironmentVariable("STRIPE_PRICE_ID_YEARLY") ?? "";
        _stripeSeatPriceId = Environment.GetEnvironmentVariable("STRIPE_SEAT_PRICE_ID") ?? "";
        _frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:3000";

        StripeConfiguration.ApiKey = _stripeSecretKey;
    }

    private Guid GetCurrentAgentId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null ? Guid.Parse(claim.Value) : Guid.Empty;
    }

    public record CheckoutRequest(string Plan); // "monthly" or "yearly"
    public record CheckoutResponse(string Url);
    public record PortalResponse(string Url);
    public record SubscriptionResponse(
        string Status,
        string? Plan,
        DateTime? CurrentPeriodEnd,
        bool CancelAtPeriodEnd,
        int SeatCount,
        decimal SeatUnitPrice,
        decimal BasePrice,
        decimal TotalMonthlyAmount
    );

    [HttpPost("checkout")]
    [Authorize]
    public async Task<ActionResult<CheckoutResponse>> CreateCheckoutSession([FromBody] CheckoutRequest request)
    {
        if (string.IsNullOrEmpty(_stripeSecretKey) || !_stripeSecretKey.StartsWith("sk_"))
        {
            return BadRequest(new { error = "Stripe not configured" });
        }

        // Validate plan
        var priceId = request.Plan?.ToLower() switch
        {
            "yearly" => _stripePriceIdYearly,
            "monthly" => _stripePriceIdMonthly,
            _ => _stripePriceIdMonthly // default to monthly
        };

        if (string.IsNullOrEmpty(priceId))
        {
            return BadRequest(new { error = "Price not configured for selected plan" });
        }

        var agentId = GetCurrentAgentId();
        var agent = await _context.Agents.FindAsync(agentId);

        if (agent == null)
            return NotFound(new { error = "Agent not found" });

        // Create or get Stripe customer
        var customerService = new CustomerService();
        Customer customer;

        if (!string.IsNullOrEmpty(agent.StripeCustomerId))
        {
            customer = await customerService.GetAsync(agent.StripeCustomerId);
        }
        else
        {
            customer = await customerService.CreateAsync(new CustomerCreateOptions
            {
                Email = agent.Email,
                Name = agent.FullName,
                Metadata = new Dictionary<string, string>
                {
                    { "agent_id", agent.Id.ToString() }
                }
            });

            agent.StripeCustomerId = customer.Id;
            await _context.SaveChangesAsync();
        }

        // Create checkout session
        var sessionService = new SessionService();
        var session = await sessionService.CreateAsync(new SessionCreateOptions
        {
            Customer = customer.Id,
            PaymentMethodTypes = new List<string> { "card" },
            LineItems = new List<SessionLineItemOptions>
            {
                new()
                {
                    Price = priceId,
                    Quantity = 1
                }
            },
            Mode = "subscription",
            SuccessUrl = $"{_frontendUrl}/dashboard?session_id={{CHECKOUT_SESSION_ID}}",
            CancelUrl = $"{_frontendUrl}/dashboard/subscription",
            Metadata = new Dictionary<string, string>
            {
                { "agent_id", agent.Id.ToString() },
                { "plan", request.Plan ?? "monthly" }
            }
        });

        return Ok(new CheckoutResponse(session.Url));
    }

    [HttpGet("subscription")]
    [Authorize]
    public async Task<ActionResult<SubscriptionResponse>> GetSubscription()
    {
        var agentId = GetCurrentAgentId();
        var agent = await _context.Agents.FindAsync(agentId);

        if (agent == null)
            return NotFound(new { error = "Agent not found" });

        // If no subscription, return trial status
        if (string.IsNullOrEmpty(agent.StripeSubscriptionId))
        {
            return Ok(new SubscriptionResponse(
                Status: "trial",
                Plan: null,
                CurrentPeriodEnd: null,
                CancelAtPeriodEnd: false,
                SeatCount: 0,
                SeatUnitPrice: 10m,
                BasePrice: 49m,
                TotalMonthlyAmount: 0m
            ));
        }

        // Get subscription details from Stripe
        if (!string.IsNullOrEmpty(_stripeSecretKey) && _stripeSecretKey.StartsWith("sk_"))
        {
            try
            {
                var subscriptionService = new SubscriptionService();
                var subscription = await subscriptionService.GetAsync(agent.StripeSubscriptionId, new SubscriptionGetOptions
                {
                    Expand = new List<string> { "items.data.price" }
                });

                // Determine plan and extract seat info from subscription items
                string? plan = null;
                int seatCount = 0;
                decimal seatUnitPrice = 10m;
                decimal basePrice = 49m;

                if (subscription.Items?.Data != null)
                {
                    foreach (var item in subscription.Items.Data)
                    {
                        var priceId = item.Price?.Id;

                        if (priceId == _stripePriceIdMonthly)
                        {
                            plan = "monthly";
                            basePrice = 49m;
                        }
                        else if (priceId == _stripePriceIdYearly)
                        {
                            plan = "yearly";
                            basePrice = 470m / 12m; // Monthly equivalent
                        }
                        else if (priceId == _stripeSeatPriceId)
                        {
                            seatCount = (int)(item.Quantity ?? 0);
                            // Get actual seat price from Stripe if available
                            if (item.Price?.UnitAmountDecimal.HasValue == true)
                            {
                                seatUnitPrice = item.Price.UnitAmountDecimal.Value / 100m;
                            }
                        }
                    }
                }

                // Calculate total monthly amount
                decimal totalMonthly = basePrice + (seatCount * seatUnitPrice);

                return Ok(new SubscriptionResponse(
                    Status: subscription.Status,
                    Plan: plan,
                    CurrentPeriodEnd: subscription.CurrentPeriodEnd,
                    CancelAtPeriodEnd: subscription.CancelAtPeriodEnd,
                    SeatCount: seatCount,
                    SeatUnitPrice: seatUnitPrice,
                    BasePrice: basePrice,
                    TotalMonthlyAmount: totalMonthly
                ));
            }
            catch (StripeException ex)
            {
                _logger.LogError(ex, "Error fetching subscription from Stripe");
            }
        }

        return Ok(new SubscriptionResponse(
            Status: agent.SubscriptionStatus.ToString().ToLower(),
            Plan: null,
            CurrentPeriodEnd: null,
            CancelAtPeriodEnd: false,
            SeatCount: 0,
            SeatUnitPrice: 10m,
            BasePrice: 49m,
            TotalMonthlyAmount: 0m
        ));
    }

    [HttpPost("portal")]
    [Authorize]
    public async Task<ActionResult<PortalResponse>> CreatePortalSession()
    {
        if (string.IsNullOrEmpty(_stripeSecretKey) || !_stripeSecretKey.StartsWith("sk_"))
        {
            return BadRequest(new { error = "Stripe not configured" });
        }

        var agentId = GetCurrentAgentId();
        var agent = await _context.Agents.FindAsync(agentId);

        if (agent == null)
            return NotFound(new { error = "Agent not found" });

        if (string.IsNullOrEmpty(agent.StripeCustomerId))
            return BadRequest(new { error = "No subscription found" });

        var portalService = new Stripe.BillingPortal.SessionService();
        var session = await portalService.CreateAsync(new Stripe.BillingPortal.SessionCreateOptions
        {
            Customer = agent.StripeCustomerId,
            ReturnUrl = $"{_frontendUrl}/dashboard/subscription"
        });

        return Ok(new PortalResponse(session.Url));
    }

    [HttpPost("sync")]
    [Authorize]
    public async Task<ActionResult> SyncSubscription()
    {
        if (string.IsNullOrEmpty(_stripeSecretKey) || !_stripeSecretKey.StartsWith("sk_"))
        {
            return BadRequest(new { error = "Stripe not configured" });
        }

        var agentId = GetCurrentAgentId();
        var agent = await _context.Agents.FindAsync(agentId);

        if (agent == null)
            return NotFound(new { error = "Agent not found" });

        if (string.IsNullOrEmpty(agent.StripeCustomerId))
            return Ok(new { message = "No Stripe customer found", status = "trial" });

        try
        {
            // Get customer's subscriptions from Stripe
            var subscriptionService = new SubscriptionService();
            var subscriptions = await subscriptionService.ListAsync(new SubscriptionListOptions
            {
                Customer = agent.StripeCustomerId,
                Limit = 1
            });

            if (subscriptions.Data.Count > 0)
            {
                var subscription = subscriptions.Data[0];
                agent.StripeSubscriptionId = subscription.Id;
                agent.SubscriptionStatus = subscription.Status switch
                {
                    "active" => SubscriptionStatus.Active,
                    "trialing" => SubscriptionStatus.Trial,
                    "past_due" => SubscriptionStatus.Active,
                    "canceled" => SubscriptionStatus.Cancelled,
                    "unpaid" => SubscriptionStatus.Expired,
                    _ => agent.SubscriptionStatus
                };
                agent.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Agent {AgentId} subscription synced: {Status}", agentId, subscription.Status);
                return Ok(new { message = "Subscription synced", status = subscription.Status });
            }

            return Ok(new { message = "No active subscription found", status = "trial" });
        }
        catch (StripeException e)
        {
            _logger.LogError(e, "Error syncing subscription for agent {AgentId}", agentId);
            return BadRequest(new { error = e.Message });
        }
    }

    [HttpPost("webhook")]
    public async Task<ActionResult> HandleWebhook()
    {
        var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();

        try
        {
            var stripeEvent = EventUtility.ConstructEvent(
                json,
                Request.Headers["Stripe-Signature"],
                _stripeWebhookSecret
            );

            switch (stripeEvent.Type)
            {
                case "checkout.session.completed":
                    await HandleCheckoutCompleted(stripeEvent);
                    break;
                case "invoice.paid":
                    await HandleInvoicePaid(stripeEvent);
                    break;
                case "invoice.payment_failed":
                    await HandlePaymentFailed(stripeEvent);
                    break;
                case "customer.subscription.deleted":
                    await HandleSubscriptionDeleted(stripeEvent);
                    break;
                case "customer.subscription.updated":
                    await HandleSubscriptionUpdated(stripeEvent);
                    break;
            }

            return Ok();
        }
        catch (StripeException e)
        {
            _logger.LogError(e, "Stripe webhook error");
            return BadRequest(new { error = e.Message });
        }
    }

    private async Task HandleCheckoutCompleted(Event stripeEvent)
    {
        var session = stripeEvent.Data.Object as Session;
        if (session?.Metadata?.TryGetValue("agent_id", out var agentIdStr) == true)
        {
            if (Guid.TryParse(agentIdStr, out var agentId))
            {
                // Find agent's admin organization
                var membership = await _context.OrganizationMembers
                    .Include(m => m.Organization)
                    .FirstOrDefaultAsync(m => m.AgentId == agentId && m.Role == Role.Admin);

                if (membership != null)
                {
                    var org = membership.Organization;
                    org.SubscriptionStatus = SubscriptionStatus.Active;
                    org.StripeSubscriptionId = session.SubscriptionId;
                    org.StripeCustomerId = session.CustomerId;
                    org.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Organization {OrgId} subscription activated", org.Id);
                }
            }
        }
    }

    private async Task HandleInvoicePaid(Event stripeEvent)
    {
        var invoice = stripeEvent.Data.Object as Invoice;
        if (invoice?.CustomerId != null)
        {
            var org = await _context.Organizations.FirstOrDefaultAsync(o => o.StripeCustomerId == invoice.CustomerId);
            if (org != null)
            {
                org.SubscriptionStatus = SubscriptionStatus.Active;
                org.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                _logger.LogInformation("Organization {OrgId} subscription renewed", org.Id);
            }
        }
    }

    private async Task HandlePaymentFailed(Event stripeEvent)
    {
        var invoice = stripeEvent.Data.Object as Invoice;
        if (invoice?.CustomerId != null)
        {
            var org = await _context.Organizations.FirstOrDefaultAsync(o => o.StripeCustomerId == invoice.CustomerId);
            if (org != null)
            {
                _logger.LogWarning("Payment failed for organization {OrgId}", org.Id);
            }
        }
    }

    private async Task HandleSubscriptionDeleted(Event stripeEvent)
    {
        var subscription = stripeEvent.Data.Object as Subscription;
        if (subscription?.CustomerId != null)
        {
            var org = await _context.Organizations.FirstOrDefaultAsync(o => o.StripeCustomerId == subscription.CustomerId);
            if (org != null)
            {
                org.SubscriptionStatus = SubscriptionStatus.Cancelled;
                org.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                _logger.LogInformation("Organization {OrgId} subscription cancelled", org.Id);
            }
        }
    }

    private async Task HandleSubscriptionUpdated(Event stripeEvent)
    {
        var subscription = stripeEvent.Data.Object as Subscription;
        if (subscription?.CustomerId != null)
        {
            var org = await _context.Organizations.FirstOrDefaultAsync(o => o.StripeCustomerId == subscription.CustomerId);
            if (org != null)
            {
                org.SubscriptionStatus = subscription.Status switch
                {
                    "active" => SubscriptionStatus.Active,
                    "past_due" => SubscriptionStatus.Active,
                    "canceled" => SubscriptionStatus.Cancelled,
                    "unpaid" => SubscriptionStatus.Expired,
                    _ => org.SubscriptionStatus
                };
                org.StripeSubscriptionId = subscription.Id;
                org.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                _logger.LogInformation("Organization {OrgId} subscription updated to {Status}", org.Id, subscription.Status);
            }
        }
    }
}
