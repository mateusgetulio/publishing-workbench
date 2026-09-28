require "test_helper"

module Pages
  class PublishTest < ActiveSupport::TestCase
    test "publishes the working draft as an immutable snapshot and points the page at it" do
      page = create_page

      result = Publish.call(page: page, expected_revision: 0)

      assert result.published?
      assert_equal sample_document, result.snapshot.document
      assert_equal 0, result.snapshot.source_revision
      assert_equal result.snapshot, page.reload.current_published_snapshot
      assert_equal 1, page.published_snapshots.count
    end

    test "INV-7 a stale revision publishes nothing" do
      page = create_page
      WorkingDrafts::Save.call(page: page, expected_revision: 0, document: sample_document)

      result = Publish.call(page: page, expected_revision: 0)

      assert_equal :stale, result.status
      assert_equal 1, result.revision
      assert_nil page.reload.current_published_snapshot_id
      assert_equal 0, page.published_snapshots.count
    end

    test "INV-7 a draft that fails publish validation publishes nothing and keeps the previous snapshot" do
      page = create_page
      first = Publish.call(page: page, expected_revision: 0).snapshot
      WorkingDrafts::Save.call(page: page, expected_revision: 0, document: with_block(sample_document, 0, props: { "headline" => "" }))

      result = Publish.call(page: page, expected_revision: 1)

      assert_equal :invalid, result.status
      assert_equal [ [ "11111111-1111-4111-8111-111111111111", "headline" ] ], result.issues.map { |issue| [ issue.block_id, issue.field ] }
      assert_equal first.id, page.reload.current_published_snapshot_id
      assert_equal 1, page.published_snapshots.count
    end

    test "INV-7 a failure after the snapshot insert rolls the publication back" do
      page = create_page
      first = Publish.call(page: page, expected_revision: 0).snapshot
      page.define_singleton_method(:update!) { |*| raise ActiveRecord::RecordInvalid }

      assert_raises(ActiveRecord::RecordInvalid) { Publish.call(page: page, expected_revision: 0) }

      assert_equal first.id, Page.find(page.id).current_published_snapshot_id
      assert_equal 1, page.published_snapshots.count
    end

    test "publishing again creates a new snapshot and leaves the old one untouched" do
      page = create_page
      first = Publish.call(page: page, expected_revision: 0).snapshot
      changed = with_block(sample_document, 0, props: { "headline" => "Second" })
      WorkingDrafts::Save.call(page: page, expected_revision: 0, document: changed)

      second = Publish.call(page: page, expected_revision: 1).snapshot

      assert_equal sample_document, first.reload.document
      assert_equal changed, second.document
      assert_equal second.id, page.reload.current_published_snapshot_id
      assert_equal [ first.id, second.id ], page.published_snapshots.order(:id).pluck(:id)
    end
  end
end
