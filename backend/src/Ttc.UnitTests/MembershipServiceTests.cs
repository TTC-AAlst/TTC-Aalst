using Ttc.DataAccess.Services;
using Ttc.DataEntities;

namespace Ttc.UnitTests;

public class MembershipServiceTests
{
    [Fact]
    public void SyncContact_CombinesStreetNumberAndBus()
    {
        var player = new PlayerEntity { Address = "Oud", City = "Oud" };
        var membership = new PlayerMembershipEntity { Street = "Kerkstraat", HouseNumber = "12", Bus = "3", PostalCode = "9300", Town = "Aalst" };

        MembershipService.SyncContact(membership, player);

        Assert.Equal("Kerkstraat 12 bus 3", player.Address);
        Assert.Equal("9300 Aalst", player.City);
    }

    [Fact]
    public void SyncContact_KeepsExistingAddressWhenEmpty()
    {
        var player = new PlayerEntity { Address = "Kerkstraat 1", City = "9300 Aalst" };

        MembershipService.SyncContact(new PlayerMembershipEntity(), player);

        Assert.Equal("Kerkstraat 1", player.Address);
        Assert.Equal("9300 Aalst", player.City);
    }
}
