class PublicPagesController < RenderedPageController
  def show
    page = Page.find_by!(slug: params[:slug])
    snapshot = page.current_published_snapshot
    raise ActiveRecord::RecordNotFound if snapshot.nil?

    etag = %("#{Rendering::PublicRenderer.cache_key(snapshot)}")
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "public, max-age=0, must-revalidate"
    return head :not_modified if request.if_none_match_etags.include?(etag)

    @title = page.title
    @body_html = Rendering::PublicRenderer.render(snapshot)
  end
end
