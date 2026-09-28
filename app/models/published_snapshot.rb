class PublishedSnapshot < ApplicationRecord
  belongs_to :page

  def readonly?
    persisted?
  end

  def number
    page.published_snapshots.where(id: ..id).count
  end
end
