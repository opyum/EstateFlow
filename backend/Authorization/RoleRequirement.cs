using Microsoft.AspNetCore.Authorization;

namespace EstateFlow.Api.Authorization;

public class RequireAdminAttribute : AuthorizeAttribute
{
    public RequireAdminAttribute()
    {
        Roles = "Admin";
    }
}

public class RequireTeamLeadOrAboveAttribute : AuthorizeAttribute
{
    public RequireTeamLeadOrAboveAttribute()
    {
        Roles = "Admin,TeamLead";
    }
}
