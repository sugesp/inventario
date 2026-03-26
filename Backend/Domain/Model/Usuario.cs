namespace Domain.Model;

public class Usuario : BaseEntity
{
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Cpf { get; set; } = string.Empty;
    public string Perfil { get; set; } = "Operador";
    public string Status { get; set; } = "Ativo";
    public Guid? EquipeId { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string PasswordSalt { get; set; } = string.Empty;
    public bool MustChangePassword { get; set; } = true;

    public Equipe? Equipe { get; set; }
    public ICollection<EquipeContrato> EquipesContrato { get; set; } = new List<EquipeContrato>();
    public ICollection<ItemInventariado> ItensInventariados { get; set; } = new List<ItemInventariado>();
}
