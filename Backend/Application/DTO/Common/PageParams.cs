namespace Application.DTO.Common;

public class PageParams
{
    public const int MaxPageSize = 50;

    public int PageNumber { get; set; } = 1;
    public string? Term { get; set; }

    private int _pageSize = 10;
    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value > MaxPageSize ? MaxPageSize : Math.Max(1, value);
    }
}
