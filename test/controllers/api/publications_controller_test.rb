require "test_helper"

module Api
  class PublicationsControllerTest < ActionDispatch::IntegrationTest
    test "publishes and returns the snapshot" do
      page = create_page

      post api_page_publish_path(page), params: { expected_revision: 0 }, as: :json

      assert_response :created
      snapshot = response.parsed_body["snapshot"]
      assert_equal 1, snapshot["number"]
      assert_equal true, snapshot["current"]
      assert_equal snapshot["snapshot_id"], page.reload.current_published_snapshot_id
    end

    test "returns 409 for a stale revision" do
      page = create_page
      page.working_draft.update!(revision: 2)

      post api_page_publish_path(page), params: { expected_revision: 1 }, as: :json

      assert_response :conflict
      assert_equal 2, response.parsed_body["revision"]
    end

    test "returns 422 with per-block issues for an incomplete draft" do
      page = create_page(with_block(sample_document, 3, props: { "headline" => "", "button_text" => "", "button_url" => "" }))

      post api_page_publish_path(page), params: { expected_revision: 0 }, as: :json

      assert_response :unprocessable_content
      assert_equal %w[headline button_text button_url], response.parsed_body["issues"].map { |issue| issue["field"] }
    end
  end
end
