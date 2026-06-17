using System.Text.RegularExpressions;

namespace Application.Common;

public static class PersonNameNormalizer
{
    private static readonly HashSet<string> LowercaseParticles = new(StringComparer.Ordinal)
    {
        "da",
        "de",
        "do",
        "das",
        "dos",
        "e",
        "di",
        "du",
        "van",
        "von"
    };

    public static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var words = Regex.Replace(value.Trim(), @"\s+", " ")
            .ToLowerInvariant()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries);

        return string.Join(' ', words.Select((word, index) =>
            index > 0 && LowercaseParticles.Contains(word)
                ? word
                : NormalizeWord(word)));
    }

    private static string NormalizeWord(string word)
    {
        return string.Join('\'', word.Split('\'').Select(NormalizePart));
    }

    private static string NormalizePart(string part)
    {
        if (string.IsNullOrEmpty(part))
        {
            return part;
        }

        if (part.StartsWith("mc", StringComparison.Ordinal) && part.Length > 2)
        {
            return $"Mc{CapitalizeFirst(part[2..])}";
        }

        return CapitalizeFirst(part);
    }

    private static string CapitalizeFirst(string value)
    {
        return string.IsNullOrEmpty(value)
            ? value
            : $"{char.ToUpperInvariant(value[0])}{value[1..]}";
    }
}
