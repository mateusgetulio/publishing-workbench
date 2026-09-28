module Api
  class RestoresController < BaseController
    before_action :require_expected_revision

    def create
      page = Page.find(params[:page_id])
      snapshot = page.published_snapshots.find(params[:snapshot_id])
      result = Pages::Restore.call(page: page, snapshot: snapshot, expected_revision: expected_revision)

      case result.status
      when :restored then render json: { revision: result.revision, document: result.document }
      when :stale then render json: { error: "stale_revision", revision: result.revision }, status: :conflict
      end
    end
  end
end
