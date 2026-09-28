module Pages
  class Restore
    Result = Data.define(:status, :revision, :document) do
      def restored? = status == :restored
    end

    def self.call(page:, snapshot:, expected_revision:)
      new(page, snapshot, expected_revision).call
    end

    def initialize(page, snapshot, expected_revision)
      @page = page
      @snapshot = snapshot
      @expected_revision = expected_revision
    end

    def call
      raise ArgumentError, "snapshot belongs to another page" unless snapshot.page_id == page.id

      updated = WorkingDraft.where(page_id: page.id, revision: expected_revision)
        .update_all(document: snapshot.document, revision: expected_revision + 1, updated_at: Time.current)
      return Result.new(:stale, WorkingDraft.where(page_id: page.id).pick(:revision), nil) if updated.zero?

      Result.new(:restored, expected_revision + 1, snapshot.document)
    end

    private

    attr_reader :page, :snapshot, :expected_revision
  end
end
