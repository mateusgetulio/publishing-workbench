module Documents
  class PublishValidation
    def self.call(document)
      new(document).issues
    end

    def initialize(document)
      @document = document
    end

    def issues
      document.fetch("blocks").flat_map { |block| block_issues(block) }
    end

    private

    attr_reader :document

    def block_issues(block)
      definition = BlockTypes.definition(block["type"])
      props = block["props"]
      required = definition.required.filter_map do |field|
        Issue.new(block["id"], field, "#{field.humanize} is required") if props[field].blank?
      end
      urls = definition.urls.filter_map do |field|
        Issue.new(block["id"], field, "#{field.humanize} must be an http or https URL") if props[field].present? && !HttpUrl.valid?(props[field])
      end
      required + urls
    end
  end
end
