require "test_helper"

module Pages
  class RestoreTest < ActiveSupport::TestCase
    test "INV-11 restoring copies the snapshot document into the working draft and leaves history untouched" do
      generator = DocumentGenerator.new
      page = create_page(generator.document)
      snapshot = Publish.call(page: page, expected_revision: 0).snapshot
      WorkingDrafts::Save.call(page: page, expected_revision: 0, document: generator.document)

      result = Restore.call(page: page, snapshot: snapshot, expected_revision: 1)

      assert result.restored?, "seed #{generator.seed}"
      assert_equal 2, result.revision
      assert_equal snapshot.document, page.working_draft.reload.document, "seed #{generator.seed}"
      assert_equal snapshot.document, result.document
      assert_equal 2, page.working_draft.revision
      assert_equal 1, page.published_snapshots.count
      assert_equal snapshot.id, page.reload.current_published_snapshot_id
    end

    test "refuses a snapshot from another page" do
      other = create_page
      snapshot = Publish.call(page: other, expected_revision: 0).snapshot
      page = create_page

      assert_raises(ArgumentError) { Restore.call(page: page, snapshot: snapshot, expected_revision: 0) }
      assert_equal sample_document, page.working_draft.reload.document
      assert_equal 0, page.working_draft.revision
    end

    test "a stale expected revision restores nothing" do
      page = create_page
      snapshot = Publish.call(page: page, expected_revision: 0).snapshot
      edited = with_block(sample_document, 0, props: { "headline" => "Edited" })
      WorkingDrafts::Save.call(page: page, expected_revision: 0, document: edited)

      result = Restore.call(page: page, snapshot: snapshot, expected_revision: 0)

      assert_equal :stale, result.status
      assert_equal 1, result.revision
      assert_equal edited, page.working_draft.reload.document
    end
  end
end
