using backend.src.Data;
using backend.src.Dto.AuthDto;

namespace backend.src.Services;

public class AuthService(AppDbContext dbContext)
{
    public LoginResponse Login()
    {
        try
        {
            return new LoginResponse("Hello from login function", "");
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"An error occur during login {ex}");
        }
    }
}
