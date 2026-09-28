class SnapshotPayload
  def initialize(snapshot, current:, number: snapshot.number)
    @snapshot = snapshot
    @current = current
    @number = number
  end

  def to_h
    { snapshot_id: snapshot.id, number: number, published_at: snapshot.published_at, source_revision: snapshot.source_revision, current: current }
  end

  private

  attr_reader :snapshot, :current, :number
end
