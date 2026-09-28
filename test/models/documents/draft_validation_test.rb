require "test_helper"

module Documents
  class DraftValidationTest < ActiveSupport::TestCase
    test "a structurally valid document has no issues even with empty required fields" do
      document = with_block(sample_document, 0, props: { "headline" => "" })

      assert_empty DraftValidation.call(document)
    end

    test "rejects a document without a blocks array" do
      assert_equal [ "document must be an object with a blocks array" ], messages(DraftValidation.call({ "blocks" => "nope" }))
      assert_equal [ "document must be an object with a blocks array" ], messages(DraftValidation.call(nil))
    end

    test "rejects an unknown block type" do
      issues = DraftValidation.call(with_block(sample_document, 1, type: "video"))

      assert_equal [ [ "22222222-2222-4222-8222-222222222222", "type" ] ], issues.map { |issue| [ issue.block_id, issue.field ] }
    end

    test "rejects duplicate block ids" do
      document = with_block(sample_document, 1, id: "11111111-1111-4111-8111-111111111111")

      assert_includes messages(DraftValidation.call(document)), "duplicate block id 11111111-1111-4111-8111-111111111111"
    end

    test "rejects a missing id and non-object props" do
      document = with_block(sample_document, 2, id: "", props: "text")

      assert_equal [ "block 2 needs a non-empty string id", "props must be an object" ], messages(DraftValidation.call(document))
    end

    test "rejects unknown properties and non-string values instead of dropping them" do
      document = with_block(sample_document, 3, props: { "headline" => "x", "button_text" => 5, "color" => "red" })

      assert_equal [ "button_text must be a string", "unknown property \"color\" for cta" ], messages(DraftValidation.call(document))
    end

    private

    def messages(issues)
      issues.map(&:message)
    end
  end
end
