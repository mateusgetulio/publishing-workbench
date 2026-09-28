module Documents
  class DraftValidation
    def self.call(document)
      new(document).issues
    end

    def initialize(document)
      @document = document
    end

    def issues
      return [ Issue.new(nil, nil, "document must be an object with a blocks array") ] unless structure_ok?

      blocks.each_with_index.flat_map { |block, index| block_issues(block, index) } + duplicate_id_issues
    end

    private

    attr_reader :document

    def structure_ok?
      document.is_a?(Hash) && document["blocks"].is_a?(Array)
    end

    def blocks
      document["blocks"]
    end

    def block_issues(block, index)
      return [ Issue.new(nil, nil, "block #{index} must be an object") ] unless block.is_a?(Hash)

      id = block["id"].is_a?(String) && !block["id"].empty? ? block["id"] : nil
      issues = []
      issues << Issue.new(nil, nil, "block #{index} needs a non-empty string id") if id.nil?
      issues << Issue.new(id, "type", "unknown block type #{block["type"].inspect}") unless BlockTypes.known?(block["type"])
      issues.concat(props_issues(id, block))
    end

    def props_issues(id, block)
      props = block["props"]
      return [ Issue.new(id, "props", "props must be an object") ] unless props.is_a?(Hash)
      return [] unless BlockTypes.known?(block["type"])

      allowed = BlockTypes.definition(block["type"]).fields
      props.flat_map do |key, value|
        if allowed.exclude?(key)
          [ Issue.new(id, key, "unknown property #{key.inspect} for #{block["type"]}") ]
        elsif !value.nil? && !value.is_a?(String)
          [ Issue.new(id, key, "#{key} must be a string") ]
        else
          []
        end
      end
    end

    def duplicate_id_issues
      ids = blocks.filter_map { |block| block["id"] if block.is_a?(Hash) && block["id"].is_a?(String) }
      ids.tally.select { |_, count| count > 1 }.keys.map { |id| Issue.new(id, nil, "duplicate block id #{id}") }
    end
  end
end
