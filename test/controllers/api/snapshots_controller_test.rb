require "test_helper"

module Api
  class SnapshotsControllerTest < ActionDispatch::IntegrationTest
    test "lists snapshots newest first with numbers and the current marker" do
      page = create_page
      first = Pages::Publish.call(page: page, expected_revision: 0).snapshot
      WorkingDrafts::Save.call(page: page, expected_revision: 0, document: sample_document)
      second = Pages::Publish.call(page: page, expected_revision: 1).snapshot

      get api_page_snapshots_path(page)

      assert_response :success
      rows = response.parsed_body["snapshots"]
      assert_equal [ [ second.id, 2, true ], [ first.id, 1, false ] ], rows.map { |row| [ row["snapshot_id"], row["number"], row["current"] ] }
    end

    test "shows a snapshot with its document" do
      page = create_page
      snapshot = Pages::Publish.call(page: page, expected_revision: 0).snapshot

      get api_page_snapshot_path(page, snapshot)

      assert_response :success
      assert_equal sample_document, response.parsed_body.dig("snapshot", "document")
    end

    test "does not show another page's snapshot" do
      other = create_page
      snapshot = Pages::Publish.call(page: other, expected_revision: 0).snapshot
      page = create_page

      get api_page_snapshot_path(page, snapshot)

      assert_response :not_found
    end
  end
end
