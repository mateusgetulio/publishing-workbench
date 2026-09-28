module Pages
  class Publish
    Result = Data.define(:status, :snapshot, :revision, :issues) do
      def published? = status == :published
    end

    def self.call(page:, expected_revision:)
      new(page, expected_revision).call
    end

    def initialize(page, expected_revision)
      @page = page
      @expected_revision = expected_revision
    end

    def call
      page.transaction do
        draft = WorkingDraft.lock.find_by!(page_id: page.id)
        issues = draft.revision == expected_revision ? Documents::PublishValidation.call(draft.document) : []

        if draft.revision != expected_revision
          Result.new(:stale, nil, draft.revision, [])
        elsif issues.any?
          Result.new(:invalid, nil, draft.revision, issues)
        else
          Result.new(:published, publish(draft), draft.revision, [])
        end
      end
    end

    private

    attr_reader :page, :expected_revision

    def publish(draft)
      snapshot = page.published_snapshots.create!(document: draft.document, source_revision: draft.revision, published_at: Time.current)
      page.update!(current_published_snapshot: snapshot)
      snapshot
    end
  end
end
