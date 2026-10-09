using MimeKit;
using Ttc.Model.Players;
using Ttc.WebApi.Emailing;

namespace Ttc.UnitTests;

/// <summary>
/// TransIP's outbound spam filter rejects html-only mails more readily
/// </summary>
public class EmailBodyTests
{
    private const string Html = "Besten,<br><a href=\"https://ttc-aalst.be/ploegen/Vttl/A\">Vttl A</a> vs <b>Merelbeke G</b>";

    [Fact]
    public void Body_IsMultipartAlternative()
    {
        var body = Assert.IsType<MultipartAlternative>(EmailService.CreateBody(Html));

        Assert.Equal(["text/plain", "text/html"], body.Select(part => part.ContentType.MimeType));
    }

    [Fact]
    public void HtmlPart_KeepsTheHtmlAsIs()
    {
        var body = (MultipartAlternative)EmailService.CreateBody(Html);

        Assert.Equal(Html, body.HtmlBody);
    }

    [Fact]
    public void TextPart_HasTheTextWithoutTags()
    {
        var body = (MultipartAlternative)EmailService.CreateBody(Html);

        Assert.Contains("Besten,", body.TextBody);
        Assert.Contains("Vttl A", body.TextBody);
        Assert.Contains("Merelbeke G", body.TextBody);
        Assert.DoesNotContain("<", body.TextBody);
    }

    [Fact]
    public void TextPart_KeepsTheLineStructure()
    {
        const string html = "<p>Besten,</p>Vttl A<ul><li>Sami</li><li>Wouter</li></ul>Mvg,<br>Thomas D &amp; co";

        var body = (MultipartAlternative)EmailService.CreateBody(html);

        Assert.Equal("Besten,\nVttl A\n- Sami\n- Wouter\nMvg,\nThomas D & co", body.TextBody!.Trim().ReplaceLineEndings("\n"));
    }

    private static readonly Player Wouter = new() { Id = 1, FirstName = "Wouter" };

    [Fact]
    public void PlayerInfo_Playing()
    {
        var email = new WeekCompetitionEmailModel { Players = { [1] = "Vttl A" } };

        Assert.Equal("<br>Proficiat Wouter! Je bent opgesteld in Vttl A. Succes!<br>", EmailService.GetPlayerInfo(Wouter, email));
    }

    [Fact]
    public void PlayerInfo_Toog()
    {
        var email = new WeekCompetitionEmailModel { Toog = { [1] = "za 11/10" } };

        Assert.Equal("<br>Proficiat Wouter! Je mag de toog doen op za 11/10.<br>", EmailService.GetPlayerInfo(Wouter, email));
    }

    [Fact]
    public void PlayerInfo_PlayingAndToog_InOneSentence()
    {
        var email = new WeekCompetitionEmailModel { Players = { [1] = "Vttl A" }, Toog = { [1] = "za 11/10" } };

        Assert.Equal("<br>Proficiat Wouter! Je bent opgesteld in Vttl A én je bent barman op za 11/10! Succes!<br>", EmailService.GetPlayerInfo(Wouter, email));
    }

    [Fact]
    public void PlayerInfo_Neither()
    {
        Assert.Equal("", EmailService.GetPlayerInfo(Wouter, new WeekCompetitionEmailModel { Players = { [2] = "Vttl A" } }));
    }
}
