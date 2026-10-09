using System.Globalization;
using System.Text;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.EntityFrameworkCore;
using MimeKit;
using MimeKit.Text;
using Ttc.DataEntities.Core;
using Ttc.Model.Core;
using Ttc.Model.Players;

namespace Ttc.WebApi.Emailing;

public class EmailService
{
    private static readonly CultureInfo Culture = new("nl-BE");
    private readonly EmailConfig _config;
    private readonly ITtcDbContext _context;
    private readonly IUserProvider _userProvider;

    public EmailService(EmailConfig config, ITtcDbContext context, IUserProvider userProvider)
    {
        _config = config;
        _context = context;
        _userProvider = userProvider;
    }

    public async Task SendEmail(ICollection<Player> players, WeekCompetitionEmailModel email)
    {
        string body = email.Email;
        var tournaments = await _context.Tournaments
            .Where(x => x.Date >= DateTime.Today && x.Date <= DateTime.Today.AddDays(30))
            .OrderBy(x => x.Date)
            .ToArrayAsync();

        if (tournaments.Any())
        {
            string tournamentInfo = "";
            tournamentInfo += "<br><br>";
            tournamentInfo += "<b>Toernooitje doen?</b><br><ul>";
            foreach (var tournament in tournaments)
            {
                tournamentInfo += $"<li>{tournament.Date.ToString("ddd dd/MM/yyyy", Culture)}: {tournament.Name} ({tournament.Competition})</li>";
            }
            tournamentInfo += "</ul>";
            body = body.Replace("{{tournament-info}}", tournamentInfo);
        }
        else
        {
            body = body.Replace("{{tournament-info}}", "");
        }


        // using var client = new SmtpClient(new ProtocolLogger(Console.OpenStandardOutput()));
        using var client = new SmtpClient();
        await client.ConnectAsync(_config.Host, _config.Port, SecureSocketOptions.Auto);
        await client.AuthenticateAsync(_config.UserName, _config.Password);

        foreach (var player in players)
        {
            string customContent = body.Replace("{{player-info}}", GetPlayerInfo(player, email));

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_userProvider.Name, _config.EmailFrom));
            var toEmails = players
                .Where(ply => !string.IsNullOrWhiteSpace(ply.Contact?.Email))
                .Select(ply => new MailboxAddress(ply.FirstName + " " + ply.LastName, ply.Contact!.Email!));
            message.ReplyTo.AddRange(toEmails);
            message.To.Add(new MailboxAddress(player.FirstName + " " + player.LastName, player.Contact!.Email!));
            message.Subject = email.Title;
            message.Body = CreateBody(customContent);

            await client.SendAsync(message);
        }

        await client.DisconnectAsync(true);
    }

    public static string GetPlayerInfo(Player player, WeekCompetitionEmailModel email)
    {
        bool playing = email.Players.TryGetValue(player.Id, out string? team);
        bool toog = email.Toog.TryGetValue(player.Id, out string? toogDay);

        if (playing && toog)
        {
            return $"<br>Proficiat {player.FirstName}! Je bent opgesteld in {team} én je bent barman op {toogDay}! Succes!<br>";
        }
        if (playing)
        {
            return $"<br>Proficiat {player.FirstName}! Je bent opgesteld in {team}. Succes!<br>";
        }
        if (toog)
        {
            return $"<br>Proficiat {player.FirstName}! Je mag de toog doen op {toogDay}.<br>";
        }
        return "";
    }

    public async Task SendEmail(string email, string subject, string content)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_userProvider.Name, _config.EmailFrom));
        message.To.Add(MailboxAddress.Parse(email));
        message.Subject = subject;
        message.Body = CreateBody(content);

        using var client = new SmtpClient();
        await client.ConnectAsync(_config.Host, _config.Port, SecureSocketOptions.SslOnConnect);
        await client.AuthenticateAsync(_config.UserName, _config.Password);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }

    public static MimeEntity CreateBody(string html)
    {
        var builder = new BodyBuilder
        {
            TextBody = HtmlToText(html),
            HtmlBody = html,
        };
        return builder.ToMessageBody();
    }

    private static string HtmlToText(string html)
    {
        var text = new StringBuilder();
        var tokenizer = new HtmlTokenizer(new StringReader(html));
        while (tokenizer.ReadNextToken(out var token))
        {
            switch (token)
            {
                case HtmlDataToken data:
                    text.Append(data.Data);
                    break;
                case HtmlTagToken { Id: HtmlTagId.P or HtmlTagId.LI, IsEndTag: true }:
                case HtmlTagToken { Id: HtmlTagId.Br or HtmlTagId.UL, IsEndTag: false }:
                    text.AppendLine();
                    break;
                case HtmlTagToken { Id: HtmlTagId.LI, IsEndTag: false }:
                    text.Append("- ");
                    break;
            }
        }
        return text.ToString();
    }
}
