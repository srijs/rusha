describe("Rusha", function() {
  it("returns the correct SHA1", function() {
    var rusha = new Rusha();
    var digest = rusha.digest("a string");
    expect(digest).equals("555d01e6c83266b3e9f92bd811905370caf62770"); // created by Node's crypto module
  });
});