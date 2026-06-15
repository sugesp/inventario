namespace API.DTO.Auditoria;

public class PageViewAuditDto
{
    public string Path { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? PreviousPath { get; set; }
}
