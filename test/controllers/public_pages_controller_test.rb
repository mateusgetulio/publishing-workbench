require "test_helper"

class PublicPagesControllerTest < ActionDispatch::IntegrationTest
  test "renders the current snapshot with a literal ETag and answers 304 on a match" do
    page = create_page
    snapshot = Pages::Publish.call(page: page, expected_revision: 0).snapshot

    get public_page_path(page.slug)

    assert_response :success
    assert_equal %("snapshot-#{snapshot.id}-renderer-v1"), response.headers["ETag"]
    assert_equal "max-age=0, public, must-revalidate", response.headers["Cache-Control"]
    assert_includes response.body, "<h1>Hello</h1>"
    assert_includes response.body, "<title>Page</title>"
    refute_includes response.body, "Draft preview"

    get public_page_path(page.slug), headers: { "If-None-Match" => response.headers["ETag"] }

    assert_response :not_modified
  end

  test "INV-9 and INV-12 editing the draft after publishing leaves the public body and ETag byte-identical" do
    page = create_page
    Pages::Publish.call(page: page, expected_revision: 0)
    get public_page_path(page.slug)
    body, etag = response.body, response.headers["ETag"]

    WorkingDrafts::Save.call(page: page, expected_revision: 0, document: with_block(sample_document, 0, props: { "headline" => "Leaked?" }))
    get public_page_path(page.slug)

    assert_equal body, response.body
    assert_equal etag, response.headers["ETag"]
    refute_includes response.body, "Leaked?"
  end

  test "INV-12 publishing changes the ETag and the body" do
    page = create_page
    Pages::Publish.call(page: page, expected_revision: 0)
    get public_page_path(page.slug)
    etag = response.headers["ETag"]
    WorkingDrafts::Save.call(page: page, expected_revision: 0, document: with_block(sample_document, 0, props: { "headline" => "Published twice" }))

    Pages::Publish.call(page: page, expected_revision: 1)
    get public_page_path(page.slug)

    refute_equal etag, response.headers["ETag"]
    assert_includes response.body, "<h1>Published twice</h1>"
  end

  test "a page without a publication is not found" do
    page = create_page

    get public_page_path(page.slug)

    assert_response :not_found
  end

  test "an unknown slug is not found" do
    get public_page_path("nope")

    assert_response :not_found
  end
end
