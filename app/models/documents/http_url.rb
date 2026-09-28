module Documents
  module HttpUrl
    def self.valid?(value)
      uri = URI.parse(value.to_s)
      %w[http https].include?(uri.scheme) && uri.host.present?
    rescue URI::InvalidURIError
      false
    end
  end
end
