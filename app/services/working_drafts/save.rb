module WorkingDrafts
  class Save
    Result = Data.define(:status, :revision, :issues) do
      def saved? = status == :saved
    end

    def self.call(page:, expected_revision:, document:)
      new(page, expected_revision, document).call
    end

    def initialize(page, expected_revision, document)
      @page = page
      @expected_revision = expected_revision
      @document = document
    end

    def call
      issues = Documents::DraftValidation.call(document)
      return Result.new(:invalid, nil, issues) if issues.any?

      updated = WorkingDraft.where(page_id: page.id, revision: expected_revision)
        .update_all(document: document.to_h, revision: expected_revision + 1, updated_at: Time.current)
      return Result.new(:stale, WorkingDraft.where(page_id: page.id).pick(:revision), []) if updated.zero?

      Result.new(:saved, expected_revision + 1, [])
    end

    private

    attr_reader :page, :expected_revision, :document
  end
end
