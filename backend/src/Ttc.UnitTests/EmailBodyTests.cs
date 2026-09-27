using MimeKit;
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
}
