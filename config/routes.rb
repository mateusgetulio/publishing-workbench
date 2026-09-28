Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    resources :pages, only: :show do
      resource :draft, only: :update
      post "publish", to: "publications#create"
      resources :snapshots, only: [ :index, :show ]
      post "restore/:snapshot_id", to: "restores#create", as: :restore
    end
  end

  root "editors#index"
  get "pages/:id/edit", to: "editors#show", as: :edit_page
  get "pages/:id/preview", to: "previews#show", as: :page_preview
  get "p/:slug", to: "public_pages#show", as: :public_page
end
