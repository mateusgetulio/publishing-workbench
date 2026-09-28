require "random/formatter"

class DocumentGenerator
  def initialize(seed = Integer(ENV.fetch("WORKBENCH_TEST_SEED", Random.new_seed)))
    @seed = seed
    @random = Random.new(seed)
  end

  attr_reader :seed

  def document(size: random.rand(1..20))
    { "blocks" => Array.new(size) { block } }
  end

  def block(type = Documents::BlockTypes::TYPES.keys.sample(random: random))
    definition = Documents::BlockTypes.definition(type)
    props = definition.fields.to_h do |field|
      [ field, definition.urls.include?(field) ? "https://example.com/#{word}" : sentence ]
    end
    { "id" => random.uuid, "type" => type, "props" => props }
  end

  private

  attr_reader :random

  def word
    Array.new(random.rand(3..9)) { ("a".."z").to_a.sample(random: random) }.join
  end

  def sentence
    Array.new(random.rand(1..8)) { word }.join(" ")
  end
end
