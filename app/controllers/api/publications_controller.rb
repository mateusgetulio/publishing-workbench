module Api
  class PublicationsController < BaseController
    before_action :require_expected_revision

    def create
      page = Page.find(params[:page_id])
      result = Pages::Publish.call(page: page, expected_revision: expected_revision)

      case result.status
      when :published then render json: { snapshot: SnapshotPayload.new(result.snapshot, current: true).to_h }, status: :created
      when :stale then render json: { error: "stale_revision", revision: result.revision }, status: :conflict
      when :invalid then render json: { issues: result.issues.map(&:to_h) }, status: :unprocessable_content
      end
    end
  end
end
