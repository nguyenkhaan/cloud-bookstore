using System.Text.Json;
using System.Text.Json.Serialization;
using backend.src.Dto.EmployeeDto;
using backend.src.Models.Enums;
using Xunit;

namespace backend.Tests.Dto;

public class ChangeEmployeeRequestTests
{
    private static readonly JsonSerializerOptions JsonOptions = CreateJsonOptions();

    [Fact]
    public void Deserialize_AcceptsAdminAsAStringRole()
    {
        var request = JsonSerializer.Deserialize<ChangeEmployeeRequest>(
            """{"roleName":"ADMIN","reason":"Promote employee"}""",
            JsonOptions);

        Assert.NotNull(request);
        Assert.Equal(RoleName.ADMIN, request.RoleName);
    }

    [Fact]
    public void Deserialize_RejectsRequestWithoutRoleName()
    {
        Assert.Throws<JsonException>(() =>
            JsonSerializer.Deserialize<ChangeEmployeeRequest>(
                """{"reason":"Promote employee"}""",
                JsonOptions));
    }

    [Fact]
    public void Deserialize_RejectsNumericRole()
    {
        Assert.Throws<JsonException>(() =>
            JsonSerializer.Deserialize<ChangeEmployeeRequest>(
                """{"roleName":0,"reason":"Promote employee"}""",
                JsonOptions));
    }

    private static JsonSerializerOptions CreateJsonOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new JsonStringEnumConverter(
            namingPolicy: null,
            allowIntegerValues: false));
        return options;
    }
}
