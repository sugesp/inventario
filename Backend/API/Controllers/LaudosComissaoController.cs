using System.Security.Claims;
using Application.Contract;
using Application.DTO.LaudoTecnico;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[Authorize(Roles = "Administrador,Inventario,ControleInterno")]
[ApiController]
[Route("api/comissoes/{comissaoId:guid}/laudos")]
public class LaudosComissaoController : ControllerBase
{
    private readonly ILaudoTecnicoService _service;
    private readonly IComissaoService _comissoes;

    public LaudosComissaoController(ILaudoTecnicoService service, IComissaoService comissoes)
    {
        _service = service;
        _comissoes = comissoes;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<LaudoTecnicoDto>>> GetAll(Guid comissaoId, CancellationToken cancellationToken)
    {
        if (await _comissoes.GetByIdAsync(comissaoId, cancellationToken) is null)
        {
            return NotFound();
        }

        return Ok(await _service.GetAllAsync(cancellationToken, comissaoId));
    }

    [HttpGet("permissao")]
    public async Task<ActionResult<bool>> GetPermissao(Guid comissaoId, CancellationToken cancellationToken)
    {
        return Ok(await PodeEmitirAsync(comissaoId, cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LaudoTecnicoDto>> GetById(Guid comissaoId, Guid id, CancellationToken cancellationToken)
    {
        var laudo = await _service.GetByIdAsync(id, cancellationToken, comissaoId);
        return laudo is null ? NotFound() : Ok(laudo);
    }

    [HttpPost]
    public async Task<ActionResult<LaudoTecnicoDto>> Create(Guid comissaoId, [FromBody] LaudoTecnicoSaveDto dto, CancellationToken cancellationToken)
    {
        if (!await PodeEmitirAsync(comissaoId, cancellationToken))
        {
            return Forbid();
        }

        try
        {
            var created = await _service.CreateAsync(dto, GetUsuarioId(), cancellationToken, comissaoId);
            return CreatedAtAction(nameof(GetById), new { comissaoId, id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/identificacao")]
    public async Task<ActionResult<LaudoTecnicoDto>> UpdateIdentificacao(
        Guid comissaoId, Guid id, [FromBody] LaudoTecnicoIdentificacaoDto dto, CancellationToken cancellationToken)
    {
        if (!await PodeEmitirAsync(comissaoId, cancellationToken))
        {
            return Forbid();
        }

        var updated = await _service.UpdateIdentificacaoAsync(id, dto, cancellationToken, comissaoId);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpPost("{id:guid}/fotos")]
    [RequestSizeLimit(50_000_000)]
    public async Task<ActionResult<LaudoTecnicoDto>> AddFotos(
        Guid comissaoId, Guid id, [FromForm] List<IFormFile> fotos,
        [FromForm] List<string> categorias, CancellationToken cancellationToken)
    {
        if (!await PodeEmitirAsync(comissaoId, cancellationToken))
        {
            return Forbid();
        }

        try
        {
            var updated = await _service.AddFotosAsync(id, fotos, categorias, cancellationToken, comissaoId);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:guid}/fotos/{fotoId:guid}")]
    public async Task<IActionResult> GetFoto(Guid comissaoId, Guid id, Guid fotoId, CancellationToken cancellationToken)
    {
        var result = await _service.GetFotoAsync(id, fotoId, cancellationToken, comissaoId);
        return result is null ? NotFound() : File(result.Value.Stream, result.Value.ContentType, result.Value.FileName);
    }

    private Task<bool> PodeEmitirAsync(Guid comissaoId, CancellationToken cancellationToken)
    {
        return _comissoes.PodeEmitirLaudoAsync(comissaoId, GetUsuarioId(), cancellationToken);
    }

    private Guid GetUsuarioId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(value, out var id) ? id : Guid.Empty;
    }
}
