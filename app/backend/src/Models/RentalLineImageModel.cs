using System.ComponentModel.DataAnnotations;

namespace backend.src.Models;

public class RentalLineImageModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RentalLineId { get; set; }
    [Required, MaxLength(255)] public string PublicImageId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
