using System.Text.Json;

namespace Domain.Security;

public static class UsuarioPermissoes
{
    public const string Administrador = "Administrador";
    public const string Inventario = "Inventario";
    public const string Levantamento = "Levantamento";
    public const string GtiTecnico = "GTI.Tecnico";
    public const string GtiGestor = "GTI.Gestor";

    public static readonly IReadOnlyList<string> All = new[]
    {
        Administrador,
        Inventario,
        Levantamento,
        GtiTecnico,
        GtiGestor
    };

    public static IReadOnlyCollection<string> Deserialize(string? permissoesJson)
    {
        if (string.IsNullOrWhiteSpace(permissoesJson))
        {
            return Array.Empty<string>();
        }

        try
        {
            var permissoes = JsonSerializer.Deserialize<List<string>>(permissoesJson) ?? [];
            return NormalizeMany(permissoes);
        }
        catch (JsonException)
        {
            return Array.Empty<string>();
        }
    }

    public static string Serialize(IEnumerable<string>? permissoes)
    {
        return JsonSerializer.Serialize(NormalizeMany(permissoes));
    }

    public static IReadOnlyCollection<string> NormalizeMany(IEnumerable<string>? permissoes)
    {
        if (permissoes is null)
        {
            return Array.Empty<string>();
        }

        var normalized = permissoes
            .Select(Normalize)
            .Where(x => x is not null)
            .Cast<string>()
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(GetSortOrder)
            .ToArray();

        return normalized;
    }

    public static bool HasPermission(string? permissoesJson, string permissao)
    {
        return Deserialize(permissoesJson).Contains(Normalize(permissao) ?? permissao, StringComparer.OrdinalIgnoreCase);
    }

    public static string? Normalize(string? permissao)
    {
        if (string.IsNullOrWhiteSpace(permissao))
        {
            return null;
        }

        var normalized = permissao.Trim();

        return normalized switch
        {
            _ when string.Equals(normalized, Administrador, StringComparison.OrdinalIgnoreCase) => Administrador,
            _ when string.Equals(normalized, Inventario, StringComparison.OrdinalIgnoreCase) => Inventario,
            _ when string.Equals(normalized, Levantamento, StringComparison.OrdinalIgnoreCase) => Levantamento,
            _ when string.Equals(normalized, GtiTecnico, StringComparison.OrdinalIgnoreCase) => GtiTecnico,
            _ when string.Equals(normalized, GtiGestor, StringComparison.OrdinalIgnoreCase) => GtiGestor,
            _ => null
        };
    }

    private static int GetSortOrder(string permissao)
    {
        var index = Array.IndexOf(All.ToArray(), permissao);
        return index >= 0 ? index : int.MaxValue;
    }
}
