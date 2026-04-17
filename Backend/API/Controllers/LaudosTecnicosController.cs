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

    [HttpGet]
    public async Task<ActionResult<IEnumerable<LaudoTecnicoDto>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAllAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LaudoTecnicoDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var laudo = await _service.GetByIdAsync(id, cancellationToken);
        return laudo is null ? NotFound() : Ok(laudo);
    }

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
