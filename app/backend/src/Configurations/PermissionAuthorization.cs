using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Controllers;

namespace backend.src.Configurations;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class PermissionAttribute(string defaultRoles) : AuthorizeAttribute(PolicyName)
{
    public const string PolicyName = "DynamicRolePermissions";
    public string DefaultRoles { get; } = defaultRoles;
}

public sealed class PermissionRequirement : IAuthorizationRequirement;

public sealed class PermissionAuthorizationHandler(RolePermissionService permissions)
    : AuthorizationHandler<PermissionRequirement>
{
    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        if (context.Resource is not HttpContext http || context.User.Identity?.IsAuthenticated != true) return;
        var action = http.GetEndpoint()?.Metadata.GetMetadata<ControllerActionDescriptor>();
        if (action != null && await permissions.IsAllowedAsync(
            $"{action.ControllerName}.{action.ActionName}", context.User.FindFirst("role")?.Value, http.RequestAborted))
            context.Succeed(requirement);
    }
}
