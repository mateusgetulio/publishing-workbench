class Page < ApplicationRecord
  has_one :working_draft, dependent: :destroy
  has_many :published_snapshots
  belongs_to :current_published_snapshot, class_name: "PublishedSnapshot", optional: true

  validates :slug, :title, presence: true
end
