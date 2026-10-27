
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace backend.src.Configurations;

internal sealed class BearerSecuritySchemeTransformer(
    IAuthenticationSchemeProvider authenticationSchemeProvider,
    AuthCookieSettings authCookieSettings
) : IOpenApiDocumentTransformer
{
    public async Task TransformAsync(
        OpenApiDocument document,
        OpenApiDocumentTransformerContext context,
        CancellationToken cancellationToken)
    {
        var schemes = await authenticationSchemeProvider
            .GetAllSchemesAsync();

        if (!schemes.Any(scheme => scheme.Name == "Bearer"))
            return;

        var components = document.Components ??= new OpenApiComponents();
        components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();

        components.SecuritySchemes["Bearer"] =
            new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "Temporary fallback for non-browser callers that send an access JWT."
            };
        components.SecuritySchemes["CookieAuth"] =
            new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.ApiKey,
                In = ParameterLocation.Cookie,
                Name = authCookieSettings.AccessCookieName,
                Description = "Browser authentication through an HttpOnly access-token cookie. Unsafe requests also require X-CSRF-Token."
            };
    }
}
