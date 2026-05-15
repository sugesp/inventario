using Application.Contract;
using Application.DTO.UnidadeAdministrativa;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class UnidadesAdministrativasController : ControllerBase
{
    private readonly IUnidadeAdministrativaService _service;

    public UnidadesAdministrativasController(IUnidadeAdministrativaService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UnidadeAdministrativaDto>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAllAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UnidadeAdministrativaDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var unidade = await _service.GetByIdAsync(id, cancellationToken);
        return unidade is null ? NotFound() : Ok(unidade);
    }

    [Authorize(Roles = "Administrador")]
    [HttpPost]
    public async Task<ActionResult<UnidadeAdministrativaDto>> Create(
        [FromBody] UnidadeAdministrativaCreateUpdateDto dto,
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

    [Authorize(Roles = "Administrador")]
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<UnidadeAdministrativaDto>> Update(
        Guid id,
        [FromBody] UnidadeAdministrativaCreateUpdateDto dto,
        CancellationToken cancellationToken
    )
    {
        try
        {
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
}
