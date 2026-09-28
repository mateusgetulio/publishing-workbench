Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    resources :pages, only: :show do
      resource :draft, only: :update
    end
  end
end
