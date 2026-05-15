using Application.Contract;
using Application.DTO.Local;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class LocaisController : ControllerBase
{
    private readonly ILocalService _service;
    private readonly IEquipeService _equipeService;
    private readonly IComissaoService _comissaoService;

    public LocaisController(ILocalService service, IEquipeService equipeService, IComissaoService comissaoService)
    {
        _service = service;
        _equipeService = equipeService;
        _comissaoService = comissaoService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<LocalDto>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAllAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LocalDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _service.GetByIdAsync(id, cancellationToken);
        return entity is null ? NotFound() : Ok(entity);
    }

    [Authorize(Roles = "Administrador,Inventario")]
    [HttpPost]
    public async Task<ActionResult<LocalDto>> Create([FromBody] LocalCreateUpdateDto dto, CancellationToken cancellationToken)
    {
        try
        {
            if (!await CanManageEquipeAsync(dto.EquipeId, cancellationToken))
            {
                return Forbid();
            }

            var created = await _service.CreateAsync(dto, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Administrador,Inventario")]
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<LocalDto>> Update(Guid id, [FromBody] LocalCreateUpdateDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var atual = await _service.GetByIdAsync(id, cancellationToken);
            if (atual is null)
            {
                return NotFound();
            }

            if (!await CanManageEquipeAsync(atual.EquipeId, cancellationToken))
            {
                return Forbid();
            }

            var updated = await _service.UpdateAsync(id, dto, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Administrador,Inventario")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var atual = await _service.GetByIdAsync(id, cancellationToken);
        if (atual is null)
        {
            return NotFound();
        }

        if (!await CanManageEquipeAsync(atual.EquipeId, cancellationToken))
        {
            return Forbid();
        }

        var deleted = await _service.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    private async Task<bool> CanManageEquipeAsync(Guid equipeId, CancellationToken cancellationToken)
    {
        if (User.IsInRole("Administrador"))
        {
            return true;
        }

        var equipe = await _equipeService.GetByIdAsync(equipeId, cancellationToken);
        if (equipe?.ComissaoId is null || equipe.ComissaoId == Guid.Empty)
        {
            return false;
        }

        var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(value, out var usuarioId)
            && await _comissaoService.IsPresidentAsync(equipe.ComissaoId.Value, usuarioId, cancellationToken);
    }
}
