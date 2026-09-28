require "test_helper"

class PublishedSnapshotTest < ActiveSupport::TestCase
  test "INV-8 a persisted snapshot cannot be updated" do
    snapshot = create_snapshot

    assert_raises(ActiveRecord::ReadOnlyRecord) { snapshot.update!(source_revision: 99) }
    assert_equal 0, snapshot.reload.source_revision
  end

  test "INV-8 a persisted snapshot cannot be destroyed" do
    snapshot = create_snapshot

    assert_raises(ActiveRecord::ReadOnlyRecord) { snapshot.destroy! }
    assert PublishedSnapshot.exists?(snapshot.id)
  end

  test "number counts snapshots of the same page in publication order" do
    page = create_page
    first = page.published_snapshots.create!(document: sample_document, source_revision: 0, published_at: Time.current)
    second = page.published_snapshots.create!(document: sample_document, source_revision: 1, published_at: Time.current)
    create_snapshot

    assert_equal 1, first.number
    assert_equal 2, second.number
  end

  private

  def create_snapshot
    page = create_page
    page.published_snapshots.create!(document: sample_document, source_revision: 0, published_at: Time.current)
  end
end
