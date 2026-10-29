using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace backend.src.Configurations;

public class BearerSecurityOperation : IOpenApiOperationTransformer
{
    public Task TransformAsync(
OpenApiOperation operation,
OpenApiOperationTransformerContext context,
        CancellationToken cancellationToken)
        {
        var metadata = context.Description.ActionDescriptor.EndpointMetadata;

            if (metadata.OfType<IAllowAnonymous>().Any())
            {
                operation.Security = [];
                return Task.CompletedTask;
            }

            var requiresAuthorization = metadata.OfType<IAuthorizeData>().Any();

            if (!requiresAuthorization)
            {
                operation.Security = [];
                return Task.CompletedTask;
            }

            operation.Security ??= [];

            operation.Security.Add(
                new OpenApiSecurityRequirement
                {
                    [new OpenApiSecuritySchemeReference("CookieAuth", context.Document)] = []
                });

            operation.Security.Add(
                new OpenApiSecurityRequirement
                {
                    [new OpenApiSecuritySchemeReference("Bearer", context.Document)] = []
                });

            return Task.CompletedTask;
        }
    private static bool IsUnsafeMethod(string? method)
        => method is not null &&
            (HttpMethods.IsPost(method) ||
            HttpMethods.IsPut(method) ||
            HttpMethods.IsPatch(method) ||
            HttpMethods.IsDelete(method));
}
