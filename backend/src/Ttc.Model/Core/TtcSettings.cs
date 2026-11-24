namespace Ttc.Model.Core;

public class TtcSettings
{
    public string JwtSecret { get; set; } = "";
    public string Issuer { get; set; } = "";
    public string PublicImageFolder { get; set; } = "";
    public string Origins { get; set; } = "";
    public bool StartSyncJob { get; set; }
    public string PongRankUrl { get; set; } = "";
    public EmailConfig Email { get; set; } = new();
    public string Loki { get; set; } = "";
    public string TournooikeSecret { get; set; } = "";
}
