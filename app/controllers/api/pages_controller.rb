module Api
  class PagesController < BaseController
    def show
      render json: PagePayload.new(Page.find(params[:id])).to_h
    end
  end
end
