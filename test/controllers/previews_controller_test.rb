require "test_helper"

class PreviewsControllerTest < ActionDispatch::IntegrationTest
  test "renders the working draft with a draft banner and no caching" do
    page = create_page(with_block(sample_document, 0, props: { "headline" => "Only in the draft" }))

    get page_preview_path(page)

    assert_response :success
    assert_includes response.body, "Draft preview"
    assert_includes response.body, "<h1>Only in the draft</h1>"
    assert_equal "no-store", response.headers["Cache-Control"]
    refute_match(/snapshot-/, response.headers["ETag"].to_s)
  end
end
