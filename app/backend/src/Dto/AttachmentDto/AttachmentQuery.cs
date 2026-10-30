using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;

namespace backend.src.Dto.AttachmentDto;

public sealed class AttachmentQuery
{
    [Required] public AttachmentOwnerType? OwnerType { get; init; }
    [Required] public Guid? OwnerId { get; init; }
}