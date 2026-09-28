module Rendering
  class BlockHtml
    include ActionView::Helpers::TagHelper
    include ActionView::Helpers::OutputSafetyHelper

    def self.call(block)
      new(block).call
    end

    def initialize(block)
      @block = block
    end

    def call
      case block.fetch("type")
      when "hero" then hero
      when "rich_text" then rich_text
      when "testimonial" then testimonial
      when "cta" then cta
      else raise ArgumentError, "unknown block type #{block["type"].inspect}"
      end
    end

    private

    attr_reader :block

    def props
      block.fetch("props")
    end

    def hero
      section("hero", [ text_tag(:h1, props["headline"]), text_tag(:p, props["subheadline"]), link(props["button_text"], props["button_url"]) ])
    end

    def rich_text
      section("rich-text", props["body"].to_s.split(/\n{2,}/).map { |paragraph| text_tag(:p, paragraph) })
    end

    def testimonial
      quote = safe_join([ text_tag(:p, props["quote"]), text_tag(:cite, props["author"]) ].compact)
      section("testimonial", [ tag.blockquote(quote) ])
    end

    def cta
      section("cta", [ text_tag(:h2, props["headline"]), link(props["button_text"], props["button_url"]) ])
    end

    def section(kind, parts)
      tag.section(safe_join(parts.compact), class: "block block-#{kind}", data: { block_id: block.fetch("id") })
    end

    def text_tag(name, text)
      return nil if text.blank?

      content_tag(name, text)
    end

    def link(text, url)
      return nil if text.blank? || !Documents::HttpUrl.valid?(url)

      tag.a(text, class: "button", href: url)
    end
  end
end
