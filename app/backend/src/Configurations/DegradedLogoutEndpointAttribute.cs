namespace backend.src.Configurations;

[AttributeUsage(AttributeTargets.Method)]
internal sealed class DegradedLogoutEndpointAttribute : Attribute
{
    internal static bool AppliesTo(HttpContext context) =>
        context.Items[AuthTokenSelector.CookieAuthenticationItem] is true &&
        context.GetEndpoint()?.Metadata.GetMetadata<DegradedLogoutEndpointAttribute>() is not null;
}
