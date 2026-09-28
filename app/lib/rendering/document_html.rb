module Rendering
  class DocumentHtml
    extend ActionView::Helpers::TagHelper
    extend ActionView::Helpers::OutputSafetyHelper

    def self.call(document)
      blocks = document.fetch("blocks").map { |block| BlockHtml.call(block) }
      tag.main(safe_join(blocks), class: "page", data: { renderer_version: RENDERER_VERSION })
    end
  end
end
