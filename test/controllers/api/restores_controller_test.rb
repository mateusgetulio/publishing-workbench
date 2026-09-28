require "test_helper"

module Api
  class RestoresControllerTest < ActionDispatch::IntegrationTest
    test "restores a snapshot into the working draft and returns the new revision and document" do
      page = create_page
      snapshot = Pages::Publish.call(page: page, expected_revision: 0).snapshot
      WorkingDrafts::Save.call(page: page, expected_revision: 0, document: with_block(sample_document, 0, props: { "headline" => "Changed" }))

      post api_page_restore_path(page, snapshot), params: { expected_revision: 1 }, as: :json

      assert_response :success
      assert_equal 2, response.parsed_body["revision"]
      assert_equal sample_document, response.parsed_body["document"]
    end

    test "does not restore another page's snapshot" do
      other = create_page
      snapshot = Pages::Publish.call(page: other, expected_revision: 0).snapshot
      page = create_page

      post api_page_restore_path(page, snapshot), params: { expected_revision: 0 }, as: :json

      assert_response :not_found
    end

    test "returns 409 for a stale revision" do
      page = create_page
      snapshot = Pages::Publish.call(page: page, expected_revision: 0).snapshot
      page.working_draft.update!(revision: 5)

      post api_page_restore_path(page, snapshot), params: { expected_revision: 4 }, as: :json

      assert_response :conflict
      assert_equal 5, response.parsed_body["revision"]
    end
  end
end
