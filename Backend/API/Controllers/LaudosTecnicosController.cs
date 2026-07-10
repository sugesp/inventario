using System.Security.Claims;
using Application.Contract;
using Application.DTO.LaudoTecnico;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class LaudosTecnicosController : ControllerBase
{
    private readonly ILaudoTecnicoService _service;

    public LaudosTecnicosController(ILaudoTecnicoService service)
    {
        _service = service;
    }

    [Authorize(Roles = "Administrador,GTI.Tecnico,GTI.Gestor")]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<LaudoTecnicoDto>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAllAsync(cancellationToken));
    }

    [Authorize(Roles = "Administrador,GTI.Tecnico,GTI.Gestor")]
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LaudoTecnicoDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var laudo = await _service.GetByIdAsync(id, cancellationToken);
        return laudo is null ? NotFound() : Ok(laudo);
    }

    [Authorize(Roles = "Administrador,GTI.Tecnico")]
    [HttpPost]
    public async Task<ActionResult<LaudoTecnicoDto>> Create([FromBody] LaudoTecnicoSaveDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var created = await _service.CreateAsync(dto, GetUsuarioId(), cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Administrador,GTI.Tecnico")]
    [HttpPut("{id:guid}/identificacao")]
    public async Task<ActionResult<LaudoTecnicoDto>> UpdateIdentificacao(
        Guid id,
        [FromBody] LaudoTecnicoIdentificacaoDto dto,
        CancellationToken cancellationToken)
    {
        var updated = await _service.UpdateIdentificacaoAsync(id, dto, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [Authorize(Roles = "Administrador,GTI.Tecnico")]
    [HttpPost("{id:guid}/fotos")]
    [RequestSizeLimit(50_000_000)]
    public async Task<ActionResult<LaudoTecnicoDto>> AddFotos(
        Guid id,
        [FromForm] List<IFormFile> fotos,
        [FromForm] List<string> categorias,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _service.AddFotosAsync(id, fotos, categorias, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Administrador,GTI.Tecnico,GTI.Gestor")]
    [HttpGet("{id:guid}/fotos/{fotoId:guid}")]
    public async Task<IActionResult> GetFoto(Guid id, Guid fotoId, CancellationToken cancellationToken)
    {
        var result = await _service.GetFotoAsync(id, fotoId, cancellationToken);
        return result is null
            ? NotFound()
            : File(result.Value.Stream, result.Value.ContentType, result.Value.FileName);
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
