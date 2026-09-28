module Api
  class SnapshotsController < BaseController
    def index
      page = Page.find(params[:page_id])
      snapshots = page.published_snapshots.order(:id).to_a
      payloads = snapshots.each_with_index.map do |snapshot, index|
        SnapshotPayload.new(snapshot, number: index + 1, current: snapshot.id == page.current_published_snapshot_id).to_h
      end
      render json: { snapshots: payloads.reverse }
    end

    def show
      page = Page.find(params[:page_id])
      snapshot = page.published_snapshots.find(params[:id])
      render json: { snapshot: SnapshotPayload.new(snapshot, current: snapshot.id == page.current_published_snapshot_id).to_h.merge(document: snapshot.document) }
    end
  end
end
