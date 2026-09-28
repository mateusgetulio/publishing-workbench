require "test_helper"

module Rendering
  class RenderersTest < ActiveSupport::TestCase
    test "INV-9 the public renderer refuses anything but a published snapshot" do
      page = create_page

      assert_raises(ArgumentError) { PublicRenderer.render(page.working_draft) }
      assert_raises(ArgumentError) { PublicRenderer.render(page.working_draft.document) }
      assert_raises(ArgumentError) { PublicRenderer.render(nil) }
    end

    test "the preview renderer refuses a snapshot" do
      page = create_page
      snapshot = Pages::Publish.call(page: page, expected_revision: 0).snapshot

      assert_raises(ArgumentError) { PreviewRenderer.render(snapshot) }
    end

    test "INV-10 rendering the same snapshot twice is byte-identical, for generated documents" do
      generator = DocumentGenerator.new

      10.times do
        page = create_page(generator.document)
        snapshot = Pages::Publish.call(page: page, expected_revision: 0).snapshot

        assert_equal PublicRenderer.render(snapshot), PublicRenderer.render(snapshot.reload), "seed #{generator.seed}"
      end
    end

    test "preview and public rendering share the same document rendering" do
      page = create_page
      snapshot = Pages::Publish.call(page: page, expected_revision: 0).snapshot

      assert_equal PreviewRenderer.render(page.working_draft), PublicRenderer.render(snapshot)
    end

    test "escapes text and only links to http or https URLs" do
      document = {
        "blocks" => [
          { "id" => "x", "type" => "hero", "props" => { "headline" => "<b>Hi</b>", "button_text" => "Go", "button_url" => "javascript:alert(1)" } },
          { "id" => "y", "type" => "cta", "props" => { "headline" => "Buy", "button_text" => "Now", "button_url" => "https://example.com/a?b=1&c=2" } }
        ]
      }

      html = DocumentHtml.call(document)

      assert_includes html, "<h1>&lt;b&gt;Hi&lt;/b&gt;</h1>"
      refute_includes html, "javascript:"
      assert_includes html, %(<a class="button" href="https://example.com/a?b=1&amp;c=2">Now</a>)
    end

    test "splits rich text into paragraphs on blank lines and omits empty optional parts" do
      document = {
        "blocks" => [
          { "id" => "r", "type" => "rich_text", "props" => { "body" => "One\n\nTwo" } },
          { "id" => "t", "type" => "testimonial", "props" => { "quote" => "Q", "author" => "" } }
        ]
      }

      html = DocumentHtml.call(document)

      assert_includes html, "<p>One</p><p>Two</p>"
      assert_includes html, "<blockquote><p>Q</p></blockquote>"
      refute_includes html, "<cite>"
    end

    test "the cache key is the snapshot id and the renderer version" do
      page = create_page
      snapshot = Pages::Publish.call(page: page, expected_revision: 0).snapshot

      assert_equal "snapshot-#{snapshot.id}-renderer-v1", PublicRenderer.cache_key(snapshot)
    end
  end
end
