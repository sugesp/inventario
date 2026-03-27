using System.Security.Claims;
using Application.Contract;
using Application.DTO.ItemInventariado;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ItensInventariadosController : ControllerBase
{
    private readonly IItemInventariadoService _service;

    public ItensInventariadosController(IItemInventariadoService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ItemInventariadoDto>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAllAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ItemInventariadoDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _service.GetByIdAsync(id, cancellationToken);
        return entity is null ? NotFound() : Ok(entity);
    }

    [HttpGet("consulta-publica/{tombamento}")]
    public async Task<ActionResult<ConsultaPublicaBemDto>> ConsultarResumoPublico(string tombamento, CancellationToken cancellationToken)
    {
        try
        {
            var resumo = await _service.ConsultarResumoPublicoAsync(tombamento, cancellationToken);
            return resumo is null ? NotFound() : Ok(resumo);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (HttpRequestException)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { message = "Não foi possível consultar a base pública do tombamento." });
        }
    }

    [HttpPost]
    [RequestSizeLimit(50_000_000)]
    public async Task<ActionResult<ItemInventariadoDto>> Create(
        [FromForm] ItemInventariadoFormDto dto,
        [FromForm] List<IFormFile> fotos,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var usuarioAutenticadoId = GetUsuarioId();
            var created = await _service.CreateAsync(dto, fotos, usuarioAutenticadoId, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [RequestSizeLimit(50_000_000)]
    public async Task<ActionResult<ItemInventariadoDto>> Update(
        Guid id,
        [FromForm] ItemInventariadoFormDto dto,
        [FromForm] List<IFormFile> fotos,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var updated = await _service.UpdateAsync(id, dto, fotos, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _service.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
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
