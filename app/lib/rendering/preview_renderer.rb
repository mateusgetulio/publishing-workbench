module Rendering
  class PreviewRenderer
    def self.render(draft)
      raise ArgumentError, "preview rendering accepts a WorkingDraft, got #{draft.class}" unless draft.is_a?(WorkingDraft)

      DocumentHtml.call(draft.document)
    end
  end
end
