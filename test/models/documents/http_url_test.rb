require "test_helper"

module Documents
  class HttpUrlTest < ActiveSupport::TestCase
    test "accepts http and https URLs with a host" do
      assert HttpUrl.valid?("https://example.com/a?b=1")
      assert HttpUrl.valid?("http://example.com")
    end

    test "rejects other schemes, hostless and malformed values" do
      refute HttpUrl.valid?("javascript:alert(1)")
      refute HttpUrl.valid?("https://")
      refute HttpUrl.valid?("not a url")
      refute HttpUrl.valid?(nil)
    end
  end
end
