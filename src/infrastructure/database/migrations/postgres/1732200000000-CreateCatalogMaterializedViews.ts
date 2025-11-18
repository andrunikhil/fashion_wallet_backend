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
        ci.brand_id,
        ci.category,
        ci.subcategory,
        ci.images,
        ci.is_active,
        COALESCE(SUM(ia.view_count), 0) as total_views,
        COALESCE(SUM(ia.favorite_count), 0) as total_favorites,
        COALESCE(SUM(ia.share_count), 0) as total_shares,
        COALESCE(SUM(ia.try_on_count), 0) as total_try_ons,
        (
          COALESCE(SUM(ia.view_count), 0) * 1.0 +
          COALESCE(SUM(ia.favorite_count), 0) * 3.0 +
          COALESCE(SUM(ia.share_count), 0) * 2.0 +
          COALESCE(SUM(ia.try_on_count), 0) * 5.0
        ) as popularity_score,
        MAX(ia.date) as last_activity_date
      FROM catalog.items ci
      LEFT JOIN catalog.item_analytics ia ON ci.id = ia.item_id
      WHERE ci.is_active = true
        AND ia.date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY ci.id, ci.name, ci.brand_id, ci.category, ci.subcategory, ci.images, ci.is_active
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
        ia.item_id,
        ia.date,
        ia.view_count,
        ia.favorite_count,
        ia.share_count,
        ia.try_on_count,
        ci.name as item_name,
        ci.category,
        ci.subcategory,
        bp.name as brand_name
      FROM catalog.item_analytics ia
      JOIN catalog.items ci ON ia.item_id = ci.id
      LEFT JOIN catalog.brand_partners bp ON ci.brand_id = bp.id
      WHERE ia.date >= CURRENT_DATE - INTERVAL '90 days'
      ORDER BY ia.date DESC, ia.view_count DESC
    `);

    // Create indexes on daily stats view
    await queryRunner.query(`
      CREATE INDEX idx_daily_stats_date
      ON catalog.daily_item_stats(date DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_daily_stats_item
      ON catalog.daily_item_stats(item_id, date DESC)
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
        ci.brand_id,
        ci.category,
        ci.subcategory,
        ci.images,
        COALESCE(SUM(CASE WHEN ia.date >= CURRENT_DATE - 7 THEN ia.view_count ELSE 0 END), 0) as views_last_7_days,
        COALESCE(SUM(CASE WHEN ia.date >= CURRENT_DATE - 7 THEN ia.favorite_count ELSE 0 END), 0) as favorites_last_7_days,
        COALESCE(SUM(CASE WHEN ia.date >= CURRENT_DATE - 30 THEN ia.view_count ELSE 0 END), 0) as views_last_30_days,
        -- Calculate trend score: recent activity weighted more heavily
        (
          COALESCE(SUM(CASE WHEN ia.date >= CURRENT_DATE - 7 THEN ia.view_count * 3.0 ELSE 0 END), 0) +
          COALESCE(SUM(CASE WHEN ia.date >= CURRENT_DATE - 7 THEN ia.favorite_count * 5.0 ELSE 0 END), 0) +
          COALESCE(SUM(CASE WHEN ia.date >= CURRENT_DATE - 7 THEN ia.try_on_count * 7.0 ELSE 0 END), 0)
        ) as trend_score
      FROM catalog.items ci
      LEFT JOIN catalog.item_analytics ia ON ci.id = ia.item_id
      WHERE ci.is_active = true
        AND ia.date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY ci.id, ci.name, ci.brand_id, ci.category, ci.subcategory, ci.images
      HAVING (
        COALESCE(SUM(CASE WHEN ia.date >= CURRENT_DATE - 7 THEN ia.view_count * 3.0 ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN ia.date >= CURRENT_DATE - 7 THEN ia.favorite_count * 5.0 ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN ia.date >= CURRENT_DATE - 7 THEN ia.try_on_count * 7.0 ELSE 0 END), 0)
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
      CREATE INDEX IF NOT EXISTS idx_analytics_date_item
      ON catalog.item_analytics(date DESC, item_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_item_date
      ON catalog.item_analytics(item_id, date DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_favorites_user_created
      ON catalog.user_favorites(user_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_collection_items_collection
      ON catalog.collection_items(collection_id, position)
    `);

    // Create composite indexes for common query patterns
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_items_brand_category_active
      ON catalog.items(brand_id, category, is_active)
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
      DROP INDEX IF EXISTS catalog.idx_analytics_date_item
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS catalog.idx_analytics_item_date
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS catalog.idx_favorites_user_created
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS catalog.idx_collection_items_collection
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS catalog.idx_items_brand_category_active
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS catalog.idx_items_category_subcategory_active
    `);
  }
}
