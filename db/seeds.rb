document = {
  "blocks" => [
    { "id" => "b1a2c3d4-0000-4000-8000-000000000001", "type" => "hero",
      "props" => { "headline" => "Ship pages you can trust", "subheadline" => "Edit freely. Publish deliberately.",
                   "button_text" => "Start building", "button_url" => "https://example.com/start" } },
    { "id" => "b1a2c3d4-0000-4000-8000-000000000002", "type" => "rich_text",
      "props" => { "body" => "Drafts change all day. The public page changes only when you publish." } },
    { "id" => "b1a2c3d4-0000-4000-8000-000000000003", "type" => "testimonial",
      "props" => { "quote" => "I stopped worrying about half-finished pages going live.", "author" => "A content lead" } },
    { "id" => "b1a2c3d4-0000-4000-8000-000000000004", "type" => "cta",
      "props" => { "headline" => "Ready when you are", "button_text" => "Get started", "button_url" => "https://example.com/signup" } }
  ]
}

page = Page.find_or_create_by!(slug: "launch") { |p| p.title = "Launch page" }
draft = WorkingDraft.find_or_create_by!(page: page) { |d| d.document = document }

if page.current_published_snapshot.nil?
  snapshot = page.published_snapshots.create!(document: draft.document, source_revision: draft.revision, published_at: Time.current)
  page.update!(current_published_snapshot: snapshot)
end
