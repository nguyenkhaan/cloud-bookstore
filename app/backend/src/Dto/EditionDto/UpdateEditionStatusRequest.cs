using System.ComponentModel.DataAnnotations;

namespace backend.src.Dto.EditionDto;

public record UpdateEditionStatusRequest(
    [Required] bool IsActive
);