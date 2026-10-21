using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;

namespace backend.src.Models;

public class EditionModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [MaxLength(20)] public string? Isbn { get; set; }
    public Guid TitleId { get; set; }
    [MaxLength(100)] public string? EditionStatement { get; set; }
    [MaxLength(100)] public string? PrintingStatement { get; set; }
    [MaxLength(100)] public string? Format { get; set; }
    [MaxLength(255)] public string? Publisher { get; set; }
    public short? PublishYear { get; set; }
    public long CoverPrice { get; set; }
    public long? DefaultRentPrice { get; set; }
    public int MinStockSale { get; set; }
    public int MinStockRental { get; set; }
    public string? CoverImageUrl { get; set; }
    public MetadataSource? MetadataSource { get; set; }
    public Guid? MetadataConfirmedBy { get; set; }
    public DateTime? MetadataConfirmedAt { get; set; }
    public bool IsActive { get; set; } = true;
}
