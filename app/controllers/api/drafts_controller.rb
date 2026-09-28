module Api
  class DraftsController < BaseController
    def update
      page = Page.find(params[:page_id])
      payload = request.request_parameters
      expected_revision = Integer(payload["expected_revision"], exception: false)
      return render json: { error: "expected_revision must be an integer" }, status: :unprocessable_content if expected_revision.nil?

      result = WorkingDrafts::Save.call(page: page, expected_revision: expected_revision, document: payload["document"])

      case result.status
      when :saved then render json: { revision: result.revision }
      when :stale then render json: { error: "stale_revision", revision: result.revision }, status: :conflict
      when :invalid then render json: { issues: result.issues.map(&:to_h) }, status: :unprocessable_content
      end
    end
  end
end
