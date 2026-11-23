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
        var schemes = await authenticationSchemeProvider.GetAllSchemesAsync();

        var components = document.Components ??= new OpenApiComponents();
        components.SecuritySchemes ??=
            new Dictionary<string, IOpenApiSecurityScheme>();

        if (schemes.Any(scheme => scheme.Name == "Bearer"))
        {
            components.SecuritySchemes["Bearer"] =
                new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    Description =
                        "Temporary fallback for non-browser callers that send an access JWT."
                };
        }

        components.SecuritySchemes["CsrfToken"] =
            new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.ApiKey,
                In = ParameterLocation.Header,
                Name = authCookieSettings.CsrfHeaderName,
                Description =
                    "CSRF token returned by login, session, or refresh."
            };
    }
}
