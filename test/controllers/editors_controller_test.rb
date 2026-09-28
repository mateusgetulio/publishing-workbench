require "test_helper"

class EditorsControllerTest < ActionDispatch::IntegrationTest
  test "the root redirects to the first page's editor" do
    page = create_page

    get root_path

    assert_redirected_to edit_page_path(page)
  end

  test "the editor mounts the app with the page id" do
    page = create_page

    get edit_page_path(page)

    assert_response :success
    assert_select "#app[data-page-id=?]", page.id.to_s
    assert_select "title", "Page editor"
  end
end
