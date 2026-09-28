class PreviewsController < RenderedPageController
  def show
    page = Page.find(params[:id])
    @title = "#{page.title} (draft preview)"
    @banner = "Draft preview. This is the working draft, not the published page."
    @body_html = Rendering::PreviewRenderer.render(page.working_draft)
    no_store
    render "public_pages/show"
  end
end
