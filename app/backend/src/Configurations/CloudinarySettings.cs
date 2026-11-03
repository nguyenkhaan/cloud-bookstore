using System.ComponentModel.DataAnnotations;

namespace backend.src.Configurations;

public sealed class CloudinarySettings
{
    public const string SectionName = "Cloudinary";

    [Required]
    public string CloudName { get; init; } = string.Empty;

    [Required]
    public string ApiKey { get; init; } = string.Empty;

    [Required]
    public string ApiSecret { get; init; } = string.Empty;

    [Required]
    [RegularExpression(@"^[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*$",
        ErrorMessage = "Cloudinary:RootFolder must be a slash-separated folder path without leading or trailing slashes.")]
    public string RootFolder { get; init; } = string.Empty;

    public CloudinaryFolderMode FolderMode { get; init; } = CloudinaryFolderMode.DYNAMIC;

    [Required]
    public string PublicUploadPreset { get; init; } = string.Empty;

    [Required]
    public string AuthenticatedUploadPreset { get; init; } = string.Empty;
}
