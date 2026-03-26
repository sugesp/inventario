namespace Application.DTO.Common;

public class PagedResult<T>
{
    public IReadOnlyCollection<T> Items { get; init; } = [];
    public int PageNumber { get; init; }
    public int PageSize { get; init; }
    public int TotalCount { get; init; }
    public int TotalPages { get; init; }

    public static PagedResult<T> Create(IEnumerable<T> source, PageParams pageParams)
    {
        var items = source.ToList();
        var totalCount = items.Count;
        var totalPages = totalCount == 0
            ? 0
            : (int)Math.Ceiling(totalCount / (double)pageParams.PageSize);

        var pagedItems = items
            .Skip((pageParams.PageNumber - 1) * pageParams.PageSize)
            .Take(pageParams.PageSize)
            .ToList();

        return new PagedResult<T>
        {
            Items = pagedItems,
            PageNumber = pageParams.PageNumber,
            PageSize = pageParams.PageSize,
            TotalCount = totalCount,
            TotalPages = totalPages
        };
    }
}
