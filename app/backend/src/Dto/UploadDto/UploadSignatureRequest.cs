using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;

namespace backend.src.Dto.UploadDto;

public sealed record UploadSignatureRequest(
    [Required] UploadOwnerType? OwnerType);
