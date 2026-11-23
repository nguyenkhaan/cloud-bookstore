using System.ComponentModel.DataAnnotations;

namespace backend.src.Dto.BookSeriesDto;

public record UpdateBookSeriesStatusRequest(
    [Required] bool IsActive
);