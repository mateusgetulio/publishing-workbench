class EditorsController < ApplicationController
  def index
    redirect_to edit_page_path(Page.order(:id).first!)
  end

  def show
    @page = Page.find(params[:id])
  end
end
