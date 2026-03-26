using Application.DTO.Notificacao;

namespace Application.Contract;

public interface INotificacaoService
{
    Task<IEnumerable<NotificacaoDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<NotificacaoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<NotificacaoDto> CreateAsync(NotificacaoCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<NotificacaoDto?> UpdateAsync(Guid id, NotificacaoCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
