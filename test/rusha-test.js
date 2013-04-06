describe("Rusha", function() {
  it("returns the correct SHA1 for a binray string", function() {
    var rusha = new Rusha();
    var digest = rusha.digest("a string");
    expect(digest).equals("555d01e6c83266b3e9f92bd811905370caf62770"); // created by Node's crypto module
  });

  it("returns the correct SHA1 for a utf8 encoded string", function() {
    var rusha = new Rusha();
    var digest = rusha. digestFromUTF8String("more than ASCII: öäß");
    expect(digest).equals("bf259724c5b2c21f39781d2e6b94c8bcb6c4eb1f");
  });

});