class PagePayload
  def initialize(page)
    @page = page
  end

  def to_h
    draft = page.working_draft
    {
      page: { id: page.id, slug: page.slug, title: page.title },
      draft: { document: draft.document, revision: draft.revision },
      published: published,
      publish_issues: Documents::PublishValidation.call(draft.document).map(&:to_h)
    }
  end

  private

  attr_reader :page

  def published
    snapshot = page.current_published_snapshot
    return nil if snapshot.nil?

    { snapshot_id: snapshot.id, number: snapshot.number, published_at: snapshot.published_at }
  end
end
