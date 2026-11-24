using MimeKit;
using Ttc.WebApi.Emailing;

namespace Ttc.UnitTests;

public class MembershipEmailTests
{
    private static MembershipEmailModel NewEmail() => new()
    {
        To = ["nieuw@lid.be"],
        Cc = ["info@ttc-aalst.be"],
        Subject = "Welkom",
        Email = "Welkom bij <b>TTC Aalst</b>",
        Attachments = [new EmailAttachment { FileName = "aansluiting.pdf", Base64 = Convert.ToBase64String("%PDF-1.7"u8.ToArray()) }],
    };

    [Fact]
    public void Message_HasToAndCc()
    {
        var message = EmailService.CreateMessage(NewEmail(), "Bestuur", "admin@ttc-aalst.be");

        Assert.Equal(["nieuw@lid.be"], message.To.Mailboxes.Select(x => x.Address));
        Assert.Equal(["info@ttc-aalst.be"], message.Cc.Mailboxes.Select(x => x.Address));
        Assert.Equal(["info@ttc-aalst.be"], message.ReplyTo.Mailboxes.Select(x => x.Address));
        Assert.Equal("admin@ttc-aalst.be", message.From.Mailboxes.Single().Address);
    }

    [Fact]
    public void Message_HasPdfAttachment()
    {
        var message = EmailService.CreateMessage(NewEmail(), "Bestuur", "admin@ttc-aalst.be");

        var attachment = Assert.IsType<MimePart>(message.Attachments.Single());
        Assert.Equal("aansluiting.pdf", attachment.FileName);
        Assert.Equal("application/pdf", attachment.ContentType.MimeType);
    }

    [Fact]
    public void Message_KeepsTextAndHtmlAlternative()
    {
        var message = EmailService.CreateMessage(NewEmail(), "Bestuur", "admin@ttc-aalst.be");

        Assert.Contains("TTC Aalst", message.TextBody);
        Assert.Contains("<b>TTC Aalst</b>", message.HtmlBody);
    }
}
