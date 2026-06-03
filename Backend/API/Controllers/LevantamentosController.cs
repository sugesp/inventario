using System.Security.Claims;
using Application.Contract;
using Application.DTO.Levantamento;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class LevantamentosController : ControllerBase
{
    private readonly ILevantamentoService _service;

    public LevantamentosController(ILevantamentoService service)
    {
        _service = service;
    }

    [Authorize(Roles = "Administrador,Levantamento")]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<LevantamentoDto>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAllAsync(GetUsuarioId(), User.IsInRole("Administrador"), cancellationToken));
    }

    [Authorize(Roles = "Administrador,Levantamento")]
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LevantamentoDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var levantamento = await _service.GetByIdAsync(id, GetUsuarioId(), User.IsInRole("Administrador"), cancellationToken);
        return levantamento is null ? NotFound() : Ok(levantamento);
    }

    [Authorize(Roles = "Administrador,Levantamento")]
    [HttpPost]
    public async Task<ActionResult<LevantamentoDto>> Create([FromBody] LevantamentoCreateDto dto, CancellationToken cancellationToken)
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

    [Authorize(Roles = "Administrador,Levantamento")]
    [HttpPut("{id:guid}/compartilhamentos")]
    public async Task<ActionResult<LevantamentoDto>> Compartilhar(Guid id, [FromBody] LevantamentoCompartilharDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _service.CompartilharAsync(id, dto, GetUsuarioId(), cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Administrador,Levantamento")]
    [HttpPost("{id:guid}/itens")]
    public async Task<ActionResult<LevantamentoItemDto>> ConfirmarItem(Guid id, [FromBody] LevantamentoConfirmItemDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var created = await _service.ConfirmarItemAsync(id, dto, GetUsuarioId(), cancellationToken);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Administrador,Levantamento")]
    [HttpDelete("{id:guid}/itens/{itemId:guid}")]
    public async Task<IActionResult> DeleteItem(Guid id, Guid itemId, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await _service.DeleteItemAsync(id, itemId, GetUsuarioId(), cancellationToken);
            return deleted ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Administrador,Levantamento")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await _service.DeleteAsync(id, GetUsuarioId(), cancellationToken);
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
