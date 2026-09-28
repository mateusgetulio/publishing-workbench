require "test_helper"

module Documents
  class PublishValidationTest < ActiveSupport::TestCase
    test "a complete document has no publish issues" do
      assert_empty PublishValidation.call(sample_document)
    end

    test "reports required fields per block" do
      document = with_block(sample_document, 0, props: { "headline" => "  " })
      document = with_block(document, 3, props: { "headline" => "Now", "button_text" => "", "button_url" => "" })

      assert_equal(
        [ [ "11111111-1111-4111-8111-111111111111", "headline" ],
          [ "44444444-4444-4444-8444-444444444444", "button_text" ],
          [ "44444444-4444-4444-8444-444444444444", "button_url" ] ],
        PublishValidation.call(document).map { |issue| [ issue.block_id, issue.field ] }
      )
    end

    test "requires http or https URLs where a URL is present" do
      document = with_block(sample_document, 0, props: { "headline" => "Hi", "button_url" => "javascript:alert(1)" })

      assert_equal [ "Button url must be an http or https URL" ], PublishValidation.call(document).map(&:message)
    end
  end
end
