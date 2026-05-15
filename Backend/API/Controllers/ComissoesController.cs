using Application.Contract;
using Application.DTO.Comissao;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ComissoesController : ControllerBase
{
    private readonly IComissaoService _service;

    public ComissoesController(IComissaoService service)
    {
        _service = service;
    }

    [Authorize(Roles = "Administrador,Inventario")]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ComissaoDto>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAllAsync(cancellationToken));
    }

    [HttpGet("ativa")]
    public async Task<ActionResult<ComissaoDto>> GetActive(CancellationToken cancellationToken)
    {
        var entity = await _service.GetActiveAsync(cancellationToken);
        return entity is null ? NotFound() : Ok(entity);
    }

    [Authorize(Roles = "Administrador,Inventario")]
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ComissaoDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _service.GetByIdAsync(id, cancellationToken);
        return entity is null ? NotFound() : Ok(entity);
    }

    [Authorize(Roles = "Administrador")]
    [HttpPost]
    public async Task<ActionResult<ComissaoDto>> Create(
        [FromBody] ComissaoCreateUpdateDto dto,
        CancellationToken cancellationToken
    )
    {
        try
        {
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
    public async Task<ActionResult<ComissaoDto>> Update(
        Guid id,
        [FromBody] ComissaoCreateUpdateDto dto,
        CancellationToken cancellationToken
    )
    {
        try
        {
            if (!User.IsInRole("Administrador") && !await _service.IsPresidentAsync(id, GetUsuarioId(), cancellationToken))
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

    [Authorize(Roles = "Administrador")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await _service.DeleteAsync(id, cancellationToken);
            return deleted ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private Guid GetUsuarioId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(value, out var usuarioId))
        {
            throw new InvalidOperationException("Usuário autenticado inválido.");
        }

        return usuarioId;
    }
}
