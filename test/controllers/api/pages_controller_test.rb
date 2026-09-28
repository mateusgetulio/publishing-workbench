require "test_helper"

module Api
  class PagesControllerTest < ActionDispatch::IntegrationTest
    test "returns the working draft, revision, publication state and publish issues" do
      page = create_page(with_block(sample_document, 0, props: { "headline" => "" }))

      get api_page_path(page)

      assert_response :success
      body = response.parsed_body
      assert_equal page.slug, body.dig("page", "slug")
      assert_equal 0, body.dig("draft", "revision")
      assert_equal "", body.dig("draft", "document", "blocks", 0, "props", "headline")
      assert_nil body["published"]
      assert_equal [ "headline" ], body["publish_issues"].map { |issue| issue["field"] }
    end

    test "describes the current publication when one exists" do
      page = create_page
      snapshot = page.published_snapshots.create!(document: sample_document, source_revision: 0, published_at: Time.utc(2026, 9, 28, 12, 0, 0))
      page.update!(current_published_snapshot: snapshot)

      get api_page_path(page)

      assert_response :success
      assert_equal(
        { "snapshot_id" => snapshot.id, "number" => 1, "published_at" => "2026-09-28T12:00:00.000Z" },
        response.parsed_body["published"]
      )
      assert_empty response.parsed_body["publish_issues"]
    end
  end
end
