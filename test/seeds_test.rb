require "test_helper"

class SeedsTest < ActiveSupport::TestCase
  test "the seed publishes the demo page through the publish service" do
    Rails.application.load_seed

    page = Page.find_by!(slug: "launch")
    assert_not_nil page.current_published_snapshot
    assert_equal page.working_draft.document, page.current_published_snapshot.document
    assert_empty Documents::PublishValidation.call(page.working_draft.document)
  end
end
