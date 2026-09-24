-- ============================================================
-- Product variants: ukuran, berat, atau paket per produk
-- ============================================================

CREATE TABLE IF NOT EXISTS product_variants (
  id           VARCHAR(64) PRIMARY KEY,
  product_id   VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  price        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  unit         VARCHAR(64) NOT NULL DEFAULT 'pcs',
  stock        INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  available    BOOLEAN NOT NULL DEFAULT true,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ,
  UNIQUE (product_id, name)
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id, sort_order);
