# Run using bin/ci

CI.run do
  step "Setup", "bin/setup --skip-server"

  step "Style: Ruby", "bin/rubocop"
  step "Style: TypeScript", "npm run lint"
  step "Style: Prettier", "npm run format:check"
  step "Types: TypeScript", "npm run typecheck"

  step "Security: Gem audit", "bin/bundler-audit"
  step "Security: Brakeman code analysis", "bin/brakeman --quiet --no-pager --exit-on-warn --exit-on-error"
  step "Tests: Rails", "bin/rails test"
  step "Tests: Vitest", "npm test"
  step "Tests: Seeds", "env RAILS_ENV=test bin/rails db:seed:replant"
end
