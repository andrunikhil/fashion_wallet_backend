import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 5: Performance Optimization
 * Creates materialized views for catalog performance optimization
 */
export class CreateCatalogMaterializedViews1732200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create materialized view for popular items
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW catalog.popular_items AS
      SELECT
        ci.id,
        ci.name,
        ci.brand_partner_id,
        ci.category,
        ci.subcategory,
        ci.thumbnail_url,
        ci.preview_images,
        ci.is_active,
        COALESCE(SUM(CASE WHEN ia.event_type = 'view' THEN 1 ELSE 0 END), 0) as total_views,
        COALESCE(SUM(CASE WHEN ia.event_type = 'favorite' THEN 1 ELSE 0 END), 0) as total_favorites,
        COALESCE(SUM(CASE WHEN ia.event_type = 'use' THEN 1 ELSE 0 END), 0) as total_uses,
        (
          COALESCE(SUM(CASE WHEN ia.event_type = 'view' THEN 1 ELSE 0 END), 0) * 1.0 +
          COALESCE(SUM(CASE WHEN ia.event_type = 'favorite' THEN 1 ELSE 0 END), 0) * 3.0 +
          COALESCE(SUM(CASE WHEN ia.event_type = 'use' THEN 1 ELSE 0 END), 0) * 5.0
        ) as popularity_score,
        MAX(ia.created_at) as last_activity_date
      FROM catalog.items ci
      LEFT JOIN catalog.item_analytics ia ON ci.id = ia.catalog_item_id
      WHERE ci.is_active = true
        AND (ia.created_at IS NULL OR ia.created_at >= CURRENT_DATE - INTERVAL '30 days')
      GROUP BY ci.id, ci.name, ci.brand_partner_id, ci.category, ci.subcategory, ci.thumbnail_url, ci.preview_images, ci.is_active
      ORDER BY popularity_score DESC
    `);

    // Create index on materialized view
    await queryRunner.query(`
      CREATE INDEX idx_popular_items_score
      ON catalog.popular_items(popularity_score DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_popular_items_category
      ON catalog.popular_items(category, popularity_score DESC)
    `);

    // Create materialized view for daily item statistics
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW catalog.daily_item_stats AS
      SELECT
        ia.catalog_item_id,
        DATE(ia.created_at) as date,
        SUM(CASE WHEN ia.event_type = 'view' THEN 1 ELSE 0 END) as view_count,
        SUM(CASE WHEN ia.event_type = 'favorite' THEN 1 ELSE 0 END) as favorite_count,
        SUM(CASE WHEN ia.event_type = 'use' THEN 1 ELSE 0 END) as use_count,
        SUM(CASE WHEN ia.event_type = 'search' THEN 1 ELSE 0 END) as search_count,
        ci.name as item_name,
        ci.category,
        ci.subcategory,
        bp.name as brand_name
      FROM catalog.item_analytics ia
      JOIN catalog.items ci ON ia.catalog_item_id = ci.id
      LEFT JOIN catalog.brand_partners bp ON ci.brand_partner_id = bp.id
      WHERE ia.created_at >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY ia.catalog_item_id, DATE(ia.created_at), ci.name, ci.category, ci.subcategory, bp.name
      ORDER BY date DESC, view_count DESC
    `);

    // Create indexes on daily stats view
    await queryRunner.query(`
      CREATE INDEX idx_daily_stats_date
      ON catalog.daily_item_stats(date DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_daily_stats_item
      ON catalog.daily_item_stats(catalog_item_id, date DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_daily_stats_category
      ON catalog.daily_item_stats(category, date DESC)
    `);

    // Create materialized view for trending items
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW catalog.trending_items AS
      SELECT
        ci.id,
        ci.name,
        ci.brand_partner_id,
        ci.category,
        ci.subcategory,
        ci.thumbnail_url,
        ci.preview_images,
        COALESCE(SUM(CASE WHEN ia.created_at >= CURRENT_DATE - 7 AND ia.event_type = 'view' THEN 1 ELSE 0 END), 0) as views_last_7_days,
        COALESCE(SUM(CASE WHEN ia.created_at >= CURRENT_DATE - 7 AND ia.event_type = 'favorite' THEN 1 ELSE 0 END), 0) as favorites_last_7_days,
        COALESCE(SUM(CASE WHEN ia.created_at >= CURRENT_DATE - 30 AND ia.event_type = 'view' THEN 1 ELSE 0 END), 0) as views_last_30_days,
        -- Calculate trend score: recent activity weighted more heavily
        (
          COALESCE(SUM(CASE WHEN ia.created_at >= CURRENT_DATE - 7 AND ia.event_type = 'view' THEN 3.0 ELSE 0 END), 0) +
          COALESCE(SUM(CASE WHEN ia.created_at >= CURRENT_DATE - 7 AND ia.event_type = 'favorite' THEN 5.0 ELSE 0 END), 0) +
          COALESCE(SUM(CASE WHEN ia.created_at >= CURRENT_DATE - 7 AND ia.event_type = 'use' THEN 7.0 ELSE 0 END), 0)
        ) as trend_score
      FROM catalog.items ci
      LEFT JOIN catalog.item_analytics ia ON ci.id = ia.catalog_item_id
      WHERE ci.is_active = true
        AND (ia.created_at IS NULL OR ia.created_at >= CURRENT_DATE - INTERVAL '30 days')
      GROUP BY ci.id, ci.name, ci.brand_partner_id, ci.category, ci.subcategory, ci.thumbnail_url, ci.preview_images
      HAVING (
        COALESCE(SUM(CASE WHEN ia.created_at >= CURRENT_DATE - 7 AND ia.event_type = 'view' THEN 3.0 ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN ia.created_at >= CURRENT_DATE - 7 AND ia.event_type = 'favorite' THEN 5.0 ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN ia.created_at >= CURRENT_DATE - 7 AND ia.event_type = 'use' THEN 7.0 ELSE 0 END), 0)
      ) > 0
      ORDER BY trend_score DESC
    `);

    // Create index on trending items
    await queryRunner.query(`
      CREATE INDEX idx_trending_items_score
      ON catalog.trending_items(trend_score DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_trending_items_category
      ON catalog.trending_items(category, trend_score DESC)
    `);

    // Create function to refresh all materialized views
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION catalog.refresh_materialized_views()
      RETURNS void AS $$
      BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY catalog.popular_items;
        REFRESH MATERIALIZED VIEW CONCURRENTLY catalog.daily_item_stats;
        REFRESH MATERIALIZED VIEW CONCURRENTLY catalog.trending_items;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Add additional indexes for performance optimization
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_items_active_category
      ON catalog.items(is_active, category)
      WHERE is_active = true
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_items_created_at
      ON catalog.items(created_at DESC)
      WHERE is_active = true
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_created_item
      ON catalog.item_analytics(created_at DESC, catalog_item_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_item_created
      ON catalog.item_analytics(catalog_item_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_favorites_user_created
      ON catalog.user_favorites(user_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_collection_items_collection_order
      ON catalog.collection_items(collection_id, order_index)
    `);

    // Create composite indexes for common query patterns
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_items_brand_category_active
      ON catalog.items(brand_partner_id, category, is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_items_category_subcategory_active
      ON catalog.items(category, subcategory, is_active)
      WHERE is_active = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop function
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS catalog.refresh_materialized_views()
    `);

    // Drop materialized views
    await queryRunner.query(`
      DROP MATERIALIZED VIEW IF EXISTS catalog.trending_items
    `);

    await queryRunner.query(`
      DROP MATERIALIZED VIEW IF EXISTS catalog.daily_item_stats
    `);

    await queryRunner.query(`
      DROP MATERIALIZED VIEW IF EXISTS catalog.popular_items
    `);

    // Drop additional indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS catalog.idx_items_active_category
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS catalog.idx_items_created_at
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS catalog.idx_analytics_created_item
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS catalog.idx_analytics_item_created
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS catalog.idx_favorites_user_created
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS catalog.idx_collection_items_collection_order
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS catalog.idx_items_brand_category_active
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS catalog.idx_items_category_subcategory_active
    `);
  }
}
