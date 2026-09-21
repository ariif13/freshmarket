-- ============================================================
-- FreshMarket Schema (PostgreSQL)
-- ============================================================

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id             VARCHAR(64) PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  phone          VARCHAR(50) DEFAULT '',
  address        TEXT DEFAULT '',
  role           VARCHAR(20) NOT NULL DEFAULT 'customer',
  password_reset_at TIMESTAMPTZ,
  password_reset_by VARCHAR(64),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id    VARCHAR(64) PRIMARY KEY,
  name  VARCHAR(255) NOT NULL,
  icon  VARCHAR(64) DEFAULT 'Leaf',
  sort_order INT DEFAULT 0
);

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id           VARCHAR(64) PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  category     VARCHAR(64),
  price        NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit         VARCHAR(64) DEFAULT 'pcs',
  stock        INT NOT NULL DEFAULT 0,
  description  TEXT DEFAULT '',
  image        TEXT DEFAULT '',
  badge        VARCHAR(255) DEFAULT '',
  organic      BOOLEAN NOT NULL DEFAULT false,
  available    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id              VARCHAR(64) PRIMARY KEY,
  user_id         VARCHAR(64),
  user_email      VARCHAR(255),
  customer_name   VARCHAR(255) NOT NULL,
  customer_phone  VARCHAR(50) NOT NULL,
  address         TEXT NOT NULL,
  delivery_slot   VARCHAR(255),
  payment_method  VARCHAR(64),
  notes           TEXT DEFAULT '',
  items           JSONB NOT NULL,
  items_total     NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_fee    NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total     NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          VARCHAR(50) NOT NULL DEFAULT 'Menunggu Konfirmasi',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

-- REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id            VARCHAR(64) PRIMARY KEY,
  product_id    VARCHAR(64) NOT NULL,
  product_name  VARCHAR(255),
  user_id       VARCHAR(64) NOT NULL,
  user_name     VARCHAR(255),
  rating        INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment       TEXT DEFAULT '',
  order_id      VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ,
  UNIQUE (product_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user    ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating  ON reviews(rating);

-- STORE INFO (single row: id=1)
CREATE TABLE IF NOT EXISTS store_info (
  id    INT PRIMARY KEY DEFAULT 1,
  data  JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT store_info_singleton CHECK (id = 1)
);

-- UPLOADS (kalau pilih BYTEA)
CREATE TABLE IF NOT EXISTS uploads (
  id           VARCHAR(64) PRIMARY KEY,
  filename     VARCHAR(255) NOT NULL,
  mime_type    VARCHAR(64) NOT NULL,
  data         BYTEA NOT NULL,
  size_bytes   INT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
