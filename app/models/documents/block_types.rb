module Documents
  module BlockTypes
    Definition = Data.define(:fields, :required, :urls)

    TYPES = {
      "hero" => Definition.new(%w[headline subheadline button_text button_url], %w[headline], %w[button_url]),
      "rich_text" => Definition.new(%w[body], %w[body], []),
      "testimonial" => Definition.new(%w[quote author], %w[quote], []),
      "cta" => Definition.new(%w[headline button_text button_url], %w[headline button_text button_url], %w[button_url])
    }.freeze

    def self.known?(type)
      TYPES.key?(type)
    end

    def self.definition(type)
      TYPES.fetch(type)
    end
  end
end
