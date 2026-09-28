require "test_helper"

module WorkingDrafts
  class SaveTest < ActiveSupport::TestCase
    test "saves a valid document at the expected revision and increments it" do
      page = create_page
      document = with_block(sample_document, 0, props: { "headline" => "Changed" })

      result = Save.call(page: page, expected_revision: 0, document: document)

      assert result.saved?
      assert_equal 1, result.revision
      assert_equal document, page.working_draft.reload.document
      assert_equal 1, page.working_draft.revision
    end

    test "INV-5 a stale expected revision is rejected and the stored document is unchanged" do
      page = create_page
      Save.call(page: page, expected_revision: 0, document: with_block(sample_document, 0, props: { "headline" => "First" }))

      result = Save.call(page: page, expected_revision: 0, document: with_block(sample_document, 0, props: { "headline" => "Second" }))

      assert_equal :stale, result.status
      assert_equal 1, result.revision
      assert_equal "First", page.working_draft.reload.document.dig("blocks", 0, "props", "headline")
      assert_equal 1, page.working_draft.revision
    end

    test "an invalid document is rejected with issues and nothing is written" do
      page = create_page

      result = Save.call(page: page, expected_revision: 0, document: with_block(sample_document, 0, type: "video"))

      assert_equal :invalid, result.status
      assert_equal [ "type" ], result.issues.map(&:field)
      assert_equal sample_document, page.working_draft.reload.document
      assert_equal 0, page.working_draft.revision
    end

    test "INV-4 generated documents survive a save and read back structurally equal" do
      generator = DocumentGenerator.new
      page = create_page

      20.times do |revision|
        document = generator.document
        result = Save.call(page: page, expected_revision: revision, document: document)

        assert result.saved?, "seed #{generator.seed}: save failed at revision #{revision}"
        assert_equal document, page.working_draft.reload.document, "seed #{generator.seed}"
      end
    end
  end
end
