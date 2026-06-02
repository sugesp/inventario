namespace Domain.Model;

public class Usuario : BaseEntity
{
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Cpf { get; set; } = string.Empty;
    public string PermissoesJson { get; set; } = "[]";
    public string Status { get; set; } = "Ativo";
    public string PasswordHash { get; set; } = string.Empty;
    public string PasswordSalt { get; set; } = string.Empty;
    public bool MustChangePassword { get; set; } = true;

    public ICollection<ItemInventariado> ItensInventariados { get; set; } = new List<ItemInventariado>();
    public ICollection<Comissao> ComissoesPresididas { get; set; } = new List<Comissao>();
    public ICollection<ComissaoMembro> ComissoesMembro { get; set; } = new List<ComissaoMembro>();
    public ICollection<Transferencia> TransferenciasCriadas { get; set; } = new List<Transferencia>();
    public ICollection<Transferencia> TransferenciasFinalizadas { get; set; } = new List<Transferencia>();
    public ICollection<LaudoTecnico> LaudosTecnicos { get; set; } = new List<LaudoTecnico>();
    public ICollection<Levantamento> LevantamentosCriados { get; set; } = new List<Levantamento>();
    public ICollection<LevantamentoItem> LevantamentosItensConfirmados { get; set; } = new List<LevantamentoItem>();
    public ICollection<LevantamentoCompartilhamento> LevantamentosCompartilhados { get; set; } = new List<LevantamentoCompartilhamento>();
    public ICollection<LevantamentoCompartilhamento> LevantamentosCompartilhadosPorUsuario { get; set; } = new List<LevantamentoCompartilhamento>();
}
