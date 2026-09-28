module Rendering
  class PublicRenderer
    def self.render(snapshot)
      raise ArgumentError, "public rendering accepts a PublishedSnapshot, got #{snapshot.class}" unless snapshot.is_a?(PublishedSnapshot)

      DocumentHtml.call(snapshot.document)
    end

    def self.cache_key(snapshot)
      "snapshot-#{snapshot.id}-renderer-v#{RENDERER_VERSION}"
    end
  end
end
