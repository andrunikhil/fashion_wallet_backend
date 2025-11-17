import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDesignTables1732000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create designs table
    await queryRunner.query(`
      CREATE TABLE design.designs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES shared.users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,

        -- Avatar reference
        avatar_id UUID,

        -- Categorization
        category VARCHAR(50),
        tags TEXT[],
        occasion TEXT[],
        season TEXT[],

        -- Status
        status VARCHAR(20) DEFAULT 'draft',
        visibility VARCHAR(20) DEFAULT 'private',

        -- Version control
        version INTEGER DEFAULT 1,
        fork_from UUID REFERENCES design.designs(id) ON DELETE SET NULL,

        -- Analytics
        view_count INTEGER DEFAULT 0,
        like_count INTEGER DEFAULT 0,
        fork_count INTEGER DEFAULT 0,

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        published_at TIMESTAMPTZ,
        last_edited_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,

        CONSTRAINT chk_status CHECK (status IN ('draft', 'published', 'archived')),
        CONSTRAINT chk_visibility CHECK (visibility IN ('private', 'shared', 'public')),
        CONSTRAINT chk_category CHECK (category IN ('outfit', 'top', 'bottom', 'dress', 'outerwear', 'full_collection'))
      )
    `);

    // Create indexes for designs
    await queryRunner.query(`
      CREATE INDEX idx_designs_user_id ON design.designs(user_id) WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX idx_designs_status ON design.designs(status) WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX idx_designs_visibility ON design.designs(visibility) WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX idx_designs_tags ON design.designs USING GIN(tags)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_designs_created_at ON design.designs(created_at DESC) WHERE deleted_at IS NULL
    `);

    // Create layers table
    await queryRunner.query(`
      CREATE TABLE design.layers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        design_id UUID NOT NULL REFERENCES design.designs(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        order_index INTEGER NOT NULL,
        name VARCHAR(255),

        -- Catalog item reference
        catalog_item_id UUID NOT NULL,
        catalog_item_type VARCHAR(50) NOT NULL,

        -- Transform (stored as JSONB)
        transform JSONB DEFAULT '{
          "position": {"x": 0, "y": 0, "z": 0},
          "rotation": {"x": 0, "y": 0, "z": 0},
          "scale": {"x": 1, "y": 1, "z": 1}
        }'::jsonb,

        -- Customization
        customization JSONB DEFAULT '{}'::jsonb,

        -- Visibility
        is_visible BOOLEAN DEFAULT true,
        is_locked BOOLEAN DEFAULT false,

        -- Blend mode
        blend_mode VARCHAR(20) DEFAULT 'normal',
        opacity INTEGER DEFAULT 100,

        notes TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT chk_layer_type CHECK (type IN ('silhouette', 'fabric', 'pattern', 'element', 'accessory')),
        CONSTRAINT chk_blend_mode CHECK (blend_mode IN ('normal', 'multiply', 'screen', 'overlay', 'add')),
        CONSTRAINT chk_opacity CHECK (opacity >= 0 AND opacity <= 100)
      )
    `);

    // Create indexes for layers
    await queryRunner.query(`
      CREATE INDEX idx_layers_design_id ON design.layers(design_id, order_index)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_layers_catalog_item ON design.layers(catalog_item_id)
    `);

    // Create canvas_settings table
    await queryRunner.query(`
      CREATE TABLE design.canvas_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        design_id UUID NOT NULL REFERENCES design.designs(id) ON DELETE CASCADE,

        camera JSONB DEFAULT '{
          "position": {"x": 0, "y": 1.6, "z": 3},
          "target": {"x": 0, "y": 1, "z": 0},
          "fov": 50
        }'::jsonb,

        lighting JSONB DEFAULT '{
          "preset": "studio"
        }'::jsonb,

        background JSONB DEFAULT '{
          "type": "color",
          "value": "#f0f0f0"
        }'::jsonb,

        show_grid BOOLEAN DEFAULT false,
        show_guides BOOLEAN DEFAULT false,
        snap_to_grid BOOLEAN DEFAULT false,
        grid_size DECIMAL(10,2) DEFAULT 10,

        render_quality VARCHAR(20) DEFAULT 'standard',
        antialiasing BOOLEAN DEFAULT true,
        shadows BOOLEAN DEFAULT true,
        ambient_occlusion BOOLEAN DEFAULT false,

        updated_at TIMESTAMPTZ DEFAULT NOW(),

        UNIQUE(design_id)
      )
    `);

    // Create versions table
    await queryRunner.query(`
      CREATE TABLE design.versions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        design_id UUID NOT NULL REFERENCES design.designs(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        message TEXT,

        snapshot_ref VARCHAR(255),
        diff JSONB,

        created_by UUID REFERENCES shared.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),

        UNIQUE(design_id, version_number)
      )
    `);

    // Create index for versions
    await queryRunner.query(`
      CREATE INDEX idx_versions_design_id ON design.versions(design_id, version_number DESC)
    `);

    // Create history table (partitioned by date)
    await queryRunner.query(`
      CREATE TABLE design.history (
        id BIGSERIAL,
        design_id UUID NOT NULL REFERENCES design.designs(id) ON DELETE CASCADE,
        user_id UUID REFERENCES shared.users(id),
        action VARCHAR(50) NOT NULL,
        data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      ) PARTITION BY RANGE (created_at)
    `);

    // Create partition for current month
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const nextMonth = currentDate.getMonth() === 11 ? 1 : currentDate.getMonth() + 2;
    const nextYear = currentDate.getMonth() === 11 ? year + 1 : year;
    const nextMonthStr = String(nextMonth).padStart(2, '0');

    await queryRunner.query(`
      CREATE TABLE design.history_${year}_${month}
        PARTITION OF design.history
        FOR VALUES FROM ('${year}-${month}-01') TO ('${nextYear}-${nextMonthStr}-01')
    `);

    // Create index for history
    await queryRunner.query(`
      CREATE INDEX idx_history_design_id ON design.history(design_id, created_at DESC)
    `);

    // Create collaborators table
    await queryRunner.query(`
      CREATE TABLE design.collaborators (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        design_id UUID NOT NULL REFERENCES design.designs(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES shared.users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        added_at TIMESTAMPTZ DEFAULT NOW(),

        UNIQUE(design_id, user_id),
        CONSTRAINT chk_role CHECK (role IN ('viewer', 'commenter', 'editor', 'owner'))
      )
    `);

    // Create index for collaborators
    await queryRunner.query(`
      CREATE INDEX idx_collaborators_design_id ON design.collaborators(design_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_collaborators_user_id ON design.collaborators(user_id)
    `);

    // Create exports table
    await queryRunner.query(`
      CREATE TABLE design.exports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        design_id UUID NOT NULL REFERENCES design.designs(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES shared.users(id),

        type VARCHAR(50) NOT NULL,
        format VARCHAR(20),
        options JSONB,

        status VARCHAR(20) DEFAULT 'queued',
        progress INTEGER DEFAULT 0,

        file_url TEXT,
        file_name VARCHAR(255),
        file_size BIGINT,

        error_message TEXT,
        retry_count INTEGER DEFAULT 0,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,

        CONSTRAINT chk_export_status CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
        CONSTRAINT chk_export_type CHECK (type IN ('image', 'video', 'model', 'techpack')),
        CONSTRAINT chk_progress CHECK (progress >= 0 AND progress <= 100)
      )
    `);

    // Create indexes for exports
    await queryRunner.query(`
      CREATE INDEX idx_exports_design ON design.exports(design_id, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_exports_status ON design.exports(status) WHERE status IN ('queued', 'processing')
    `);
    await queryRunner.query(`
      CREATE INDEX idx_exports_user ON design.exports(user_id, created_at DESC)
    `);

    // Create triggers for updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_designs_updated_at BEFORE UPDATE ON design.designs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_layers_updated_at BEFORE UPDATE ON design.layers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_canvas_settings_updated_at BEFORE UPDATE ON design.canvas_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_designs_updated_at ON design.designs`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_layers_updated_at ON design.layers`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_canvas_settings_updated_at ON design.canvas_settings`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column()`);

    // Drop tables in reverse order (respecting foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS design.exports CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS design.collaborators CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS design.history CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS design.versions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS design.canvas_settings CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS design.layers CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS design.designs CASCADE`);
  }
}
