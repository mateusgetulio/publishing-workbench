module Api
  class BaseController < ActionController::API
    private

    def expected_revision
      Integer(request.request_parameters["expected_revision"], exception: false)
    end

    def require_expected_revision
      return unless expected_revision.nil?

      render json: { error: "expected_revision must be an integer" }, status: :unprocessable_content
    end
  end
end
