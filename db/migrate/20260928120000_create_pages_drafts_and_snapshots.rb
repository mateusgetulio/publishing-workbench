class CreatePagesDraftsAndSnapshots < ActiveRecord::Migration[8.1]
  def change
    create_table :pages do |t|
      t.string :slug, null: false
      t.string :title, null: false
      t.integer :current_published_snapshot_id
      t.timestamps
    end
    add_index :pages, :slug, unique: true

    create_table :working_drafts do |t|
      t.references :page, null: false, foreign_key: true, index: { unique: true }
      t.json :document, null: false
      t.integer :revision, null: false, default: 0
      t.timestamps
    end

    create_table :published_snapshots do |t|
      t.references :page, null: false, foreign_key: true
      t.json :document, null: false
      t.integer :source_revision, null: false
      t.datetime :published_at, null: false
    end
  end
end
