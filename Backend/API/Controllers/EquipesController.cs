using Application.Contract;
using Application.DTO.Equipe;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class EquipesController : ControllerBase
{
    private readonly IEquipeService _service;
    private readonly IComissaoService _comissaoService;

    public EquipesController(IEquipeService service, IComissaoService comissaoService)
    {
        _service = service;
        _comissaoService = comissaoService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<EquipeDto>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAllAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<EquipeDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _service.GetByIdAsync(id, cancellationToken);
        return entity is null ? NotFound() : Ok(entity);
    }

    [Authorize(Roles = "Administrador,Inventario")]
    [HttpPost]
    public async Task<ActionResult<EquipeDto>> Create([FromBody] EquipeCreateUpdateDto dto, CancellationToken cancellationToken)
    {
        try
        {
            if (!await CanManageComissaoAsync(dto.ComissaoId, cancellationToken))
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
    public async Task<ActionResult<EquipeDto>> Update(Guid id, [FromBody] EquipeCreateUpdateDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var atual = await _service.GetByIdAsync(id, cancellationToken);
            if (atual is null)
            {
                return NotFound();
            }

            if (!await CanManageComissaoAsync(atual.ComissaoId, cancellationToken))
            {
                return Forbid();
            }

            dto.ComissaoId = atual.ComissaoId ?? dto.ComissaoId;
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

        if (!await CanManageComissaoAsync(atual.ComissaoId, cancellationToken))
        {
            return Forbid();
        }

        var deleted = await _service.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    private async Task<bool> CanManageComissaoAsync(Guid? comissaoId, CancellationToken cancellationToken)
    {
        if (User.IsInRole("Administrador"))
        {
            return true;
        }

        if (!comissaoId.HasValue || comissaoId == Guid.Empty)
        {
            return false;
        }

        var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(value, out var usuarioId)
            && await _comissaoService.IsPresidentAsync(comissaoId.Value, usuarioId, cancellationToken);
    }
}
