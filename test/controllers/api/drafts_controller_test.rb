require "test_helper"

module Api
  class DraftsControllerTest < ActionDispatch::IntegrationTest
    test "saves and returns the new revision" do
      page = create_page

      put api_page_draft_path(page), params: { expected_revision: 0, document: sample_document }, as: :json

      assert_response :success
      assert_equal({ "revision" => 1 }, response.parsed_body)
    end

    test "returns 409 with the current revision for a stale save" do
      page = create_page
      page.working_draft.update!(revision: 3)

      put api_page_draft_path(page), params: { expected_revision: 2, document: sample_document }, as: :json

      assert_response :conflict
      assert_equal({ "error" => "stale_revision", "revision" => 3 }, response.parsed_body)
    end

    test "returns 422 with issues for a structurally invalid document" do
      page = create_page

      put api_page_draft_path(page), params: { expected_revision: 0, document: with_block(sample_document, 0, type: "video") }, as: :json

      assert_response :unprocessable_content
      assert_equal "type", response.parsed_body.dig("issues", 0, "field")
    end

    test "returns 422 when expected_revision is missing" do
      page = create_page

      put api_page_draft_path(page), params: { document: sample_document }, as: :json

      assert_response :unprocessable_content
    end
  end
end
