using System.ComponentModel.DataAnnotations;

namespace backend.src.Dto.TitleDto;

public record UpdateTitleStatusRequest(
    [Required] bool IsActive
);