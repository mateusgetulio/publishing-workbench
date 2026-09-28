require "test_helper"

class DocumentGeneratorTest < ActiveSupport::TestCase
  test "the same seed generates the same documents" do
    first = DocumentGenerator.new(42)
    second = DocumentGenerator.new(42)

    assert_equal Array.new(5) { first.document }, Array.new(5) { second.document }
  end
end
