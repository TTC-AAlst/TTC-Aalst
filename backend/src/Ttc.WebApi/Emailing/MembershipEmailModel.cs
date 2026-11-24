namespace Ttc.WebApi.Emailing;

public class MembershipEmailModel
{
    public string[] To { get; set; } = [];
    public string[] Cc { get; set; } = [];
    public string Subject { get; set; } = "";
    /// <summary>
    /// Html body
    /// </summary>
    public string Email { get; set; } = "";
    public EmailAttachment[] Attachments { get; set; } = [];
}

public class EmailAttachment
{
    public string FileName { get; set; } = "";
    public string Base64 { get; set; } = "";
}
