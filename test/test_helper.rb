ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"
require_relative "support/document_generator"

module ActiveSupport
  class TestCase
    parallelize(workers: :number_of_processors)

    def sample_document
      {
        "blocks" => [
          { "id" => "11111111-1111-4111-8111-111111111111", "type" => "hero",
            "props" => { "headline" => "Hello", "subheadline" => "", "button_text" => "Go", "button_url" => "https://example.com" } },
          { "id" => "22222222-2222-4222-8222-222222222222", "type" => "rich_text", "props" => { "body" => "Body" } },
          { "id" => "33333333-3333-4333-8333-333333333333", "type" => "testimonial", "props" => { "quote" => "Nice", "author" => "Someone" } },
          { "id" => "44444444-4444-4444-8444-444444444444", "type" => "cta",
            "props" => { "headline" => "Now", "button_text" => "Buy", "button_url" => "https://example.com/buy" } }
        ]
      }
    end

    def create_page(document = sample_document, slug: "page-#{SecureRandom.hex(4)}")
      page = Page.create!(slug: slug, title: "Page")
      WorkingDraft.create!(page: page, document: document)
      page
    end

    def with_block(document, index, **changes)
      blocks = document["blocks"].map(&:dup)
      blocks[index] = blocks[index].merge(changes.transform_keys(&:to_s))
      document.merge("blocks" => blocks)
    end
  end
end
