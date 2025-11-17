import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCatalogTables1699876546000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing catalog_items table if it exists
    await queryRunner.query('DROP TABLE IF EXISTS catalog.catalog_items CASCADE');

    // Create main catalog items table
    await queryRunner.query(`
      CREATE TABLE catalog.items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        type VARCHAR(50) NOT NULL CHECK (type IN ('silhouette', 'fabric', 'pattern', 'element')),
        name VARCHAR(255) NOT NULL,
        description TEXT,

        -- Categorization
        category VARCHAR(100),
        subcategory VARCHAR(100),
        tags TEXT[] DEFAULT ARRAY[]::TEXT[],

        -- Files
        model_url TEXT,
        thumbnail_url TEXT,
        preview_images JSONB DEFAULT '[]'::jsonb,

        -- Type-specific properties
        properties JSONB DEFAULT '{}'::jsonb,

        -- Metadata
        designer_name VARCHAR(255),
        brand_partner_id UUID,
        is_exclusive BOOLEAN DEFAULT false,
        release_date DATE,

        -- Availability
        is_active BOOLEAN DEFAULT true,
        is_featured BOOLEAN DEFAULT false,
        required_tier VARCHAR(50),

        -- Analytics
        popularity_score DECIMAL(10,2) DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        use_count INTEGER DEFAULT 0,
        favorite_count INTEGER DEFAULT 0,

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    // Create indexes for catalog.items
    await queryRunner.query(`
      CREATE INDEX idx_catalog_items_type
        ON catalog.items(type) WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_catalog_items_category
        ON catalog.items(category) WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_catalog_items_tags
        ON catalog.items USING GIN(tags)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_catalog_items_active
        ON catalog.items(is_active, is_featured) WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_catalog_items_popularity
        ON catalog.items(popularity_score DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_catalog_items_search
        ON catalog.items
        USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')))
    `);

    // Create brand_partners table
    await queryRunner.query(`
      CREATE TABLE catalog.brand_partners (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        logo_url TEXT,
        website_url TEXT,
        contact_email VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        partnership_type VARCHAR(50) CHECK (partnership_type IN ('exclusive', 'featured', 'standard')),
        commission_rate DECIMAL(5,2),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_brand_partners_active
        ON catalog.brand_partners(is_active) WHERE deleted_at IS NULL
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE catalog.items
      ADD CONSTRAINT fk_brand_partner
      FOREIGN KEY (brand_partner_id)
      REFERENCES catalog.brand_partners(id)
      ON DELETE SET NULL
    `);

    // Create collections table
    await queryRunner.query(`
      CREATE TABLE catalog.collections (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        cover_image_url TEXT,
        is_public BOOLEAN DEFAULT true,
        is_featured BOOLEAN DEFAULT false,
        is_curated BOOLEAN DEFAULT false,
        curator_id UUID,
        tags TEXT[] DEFAULT ARRAY[]::TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_collections_public_featured
        ON catalog.collections(is_public, is_featured) WHERE deleted_at IS NULL
    `);

    // Create collection_items junction table
    await queryRunner.query(`
      CREATE TABLE catalog.collection_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        collection_id UUID NOT NULL REFERENCES catalog.collections(id) ON DELETE CASCADE,
        catalog_item_id UUID NOT NULL REFERENCES catalog.items(id) ON DELETE CASCADE,
        order_index INTEGER DEFAULT 0,
        added_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(collection_id, catalog_item_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_collection_items_collection
        ON catalog.collection_items(collection_id, order_index)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_collection_items_catalog_item
        ON catalog.collection_items(catalog_item_id)
    `);

    // Create user_favorites table
    await queryRunner.query(`
      CREATE TABLE catalog.user_favorites (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        catalog_item_id UUID NOT NULL REFERENCES catalog.items(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, catalog_item_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_user_favorites_user
        ON catalog.user_favorites(user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_user_favorites_catalog_item
        ON catalog.user_favorites(catalog_item_id)
    `);

    // Create item_analytics table (partitioned by month)
    await queryRunner.query(`
      CREATE TABLE catalog.item_analytics (
        id UUID DEFAULT uuid_generate_v4(),
        catalog_item_id UUID NOT NULL REFERENCES catalog.items(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('view', 'use', 'favorite', 'search')),
        user_id UUID,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (id, created_at)
      ) PARTITION BY RANGE (created_at)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_item_analytics_catalog_item
        ON catalog.item_analytics(catalog_item_id, event_type)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_item_analytics_user
        ON catalog.item_analytics(user_id)
    `);

    // Create first partition for analytics (current month)
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const nextMonth = String(new Date().getMonth() + 2).padStart(2, '0');

    await queryRunner.query(`
      CREATE TABLE catalog.item_analytics_${currentYear}_${currentMonth}
      PARTITION OF catalog.item_analytics
      FOR VALUES FROM ('${currentYear}-${currentMonth}-01') TO ('${currentYear}-${nextMonth}-01')
    `);

    // Create silhouettes table (type-specific)
    await queryRunner.query(`
      CREATE TABLE catalog.silhouettes (
        id UUID PRIMARY KEY REFERENCES catalog.items(id) ON DELETE CASCADE,
        garment_category VARCHAR(100) NOT NULL,
        fit_type VARCHAR(50),
        length VARCHAR(50),
        neckline VARCHAR(50),
        sleeve_type VARCHAR(50),
        closure_type VARCHAR(50),
        mesh_complexity VARCHAR(50),
        polygon_count INTEGER,
        lod_levels INTEGER DEFAULT 3,
        animation_ready BOOLEAN DEFAULT false,
        rig_type VARCHAR(50)
      )
    `);

    // Create fabrics table (type-specific)
    await queryRunner.query(`
      CREATE TABLE catalog.fabrics (
        id UUID PRIMARY KEY REFERENCES catalog.items(id) ON DELETE CASCADE,
        material_type VARCHAR(100) NOT NULL,
        texture_type VARCHAR(50),
        weave_pattern VARCHAR(50),
        weight VARCHAR(50),
        opacity DECIMAL(3,2),
        sheen VARCHAR(50),
        has_pbr_textures BOOLEAN DEFAULT false,
        diffuse_map_url TEXT,
        normal_map_url TEXT,
        roughness_map_url TEXT,
        metallic_map_url TEXT,
        ao_map_url TEXT,
        texture_resolution VARCHAR(50),
        seamless BOOLEAN DEFAULT false
      )
    `);

    // Create patterns table (type-specific)
    await queryRunner.query(`
      CREATE TABLE catalog.patterns (
        id UUID PRIMARY KEY REFERENCES catalog.items(id) ON DELETE CASCADE,
        pattern_type VARCHAR(100) NOT NULL,
        style VARCHAR(50),
        repeat_type VARCHAR(50),
        scale VARCHAR(50),
        colors JSONB DEFAULT '[]'::jsonb,
        is_tileable BOOLEAN DEFAULT true,
        tile_size_x INTEGER,
        tile_size_y INTEGER,
        pattern_url TEXT,
        mask_url TEXT
      )
    `);

    // Create elements table (type-specific)
    await queryRunner.query(`
      CREATE TABLE catalog.elements (
        id UUID PRIMARY KEY REFERENCES catalog.items(id) ON DELETE CASCADE,
        element_type VARCHAR(100) NOT NULL,
        placement VARCHAR(50),
        size VARCHAR(50),
        is_3d BOOLEAN DEFAULT false,
        is_customizable BOOLEAN DEFAULT false,
        color_customizable BOOLEAN DEFAULT false,
        size_customizable BOOLEAN DEFAULT false,
        rotation_customizable BOOLEAN DEFAULT false,
        model_url TEXT,
        icon_url TEXT
      )
    `);

    // Create updated_at trigger function if it doesn't exist
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    // Create triggers for updated_at
    const tables = [
      'items',
      'brand_partners',
      'collections',
    ];

    for (const table of tables) {
      await queryRunner.query(`
        CREATE TRIGGER update_catalog_${table}_updated_at
        BEFORE UPDATE ON catalog.${table}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
      `);
    }

    // Add comments
    await queryRunner.query(`COMMENT ON TABLE catalog.items IS 'Main catalog items table'`);
    await queryRunner.query(`COMMENT ON TABLE catalog.brand_partners IS 'Brand partnership information'`);
    await queryRunner.query(`COMMENT ON TABLE catalog.collections IS 'Curated collections of catalog items'`);
    await queryRunner.query(`COMMENT ON TABLE catalog.collection_items IS 'Junction table for collections and items'`);
    await queryRunner.query(`COMMENT ON TABLE catalog.user_favorites IS 'User favorite catalog items'`);
    await queryRunner.query(`COMMENT ON TABLE catalog.item_analytics IS 'Analytics events for catalog items (partitioned by month)'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all tables in reverse order
    await queryRunner.query('DROP TABLE IF EXISTS catalog.elements CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS catalog.patterns CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS catalog.fabrics CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS catalog.silhouettes CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS catalog.item_analytics CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS catalog.user_favorites CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS catalog.collection_items CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS catalog.collections CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS catalog.items CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS catalog.brand_partners CASCADE');
    await queryRunner.query('DROP FUNCTION IF EXISTS update_updated_at_column CASCADE');
  }
}
