CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('customer', 'admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(254) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS refresh_sessions_user_id_idx ON refresh_sessions(user_id);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(80) UNIQUE NOT NULL,
  icon VARCHAR(48) NOT NULL DEFAULT 'tag', is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(80) PRIMARY KEY, name VARCHAR(180) NOT NULL, brand VARCHAR(100) NOT NULL, category_id UUID NOT NULL REFERENCES categories(id),
  rating NUMERIC(3,1) NOT NULL CHECK (rating >= 0 AND rating <= 10), review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0), badge VARCHAR(60), image_url TEXT, description TEXT NOT NULL DEFAULT '',
  battery VARCHAR(80), weight VARCHAR(80), noise_cancellation BOOLEAN NOT NULL DEFAULT FALSE, wireless_charging BOOLEAN NOT NULL DEFAULT FALSE,
  best_for VARCHAR(140), affiliate_url TEXT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_category_active_idx ON products(category_id, is_active);
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email VARCHAR(254) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')), subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type, entity_id, created_at DESC);

INSERT INTO categories (name, icon) VALUES ('Trending','flame'),('Tech','monitor'),('Audio','headphones'),('Home','house'),('Gaming','gamepad-2'),('Fitness','dumbbell'),('Beauty','sparkles'),('Outdoors','mountain'),('Software','code-2') ON CONFLICT (name) DO NOTHING;
INSERT INTO products (id,name,brand,category_id,rating,review_count,price,badge,image_url,description,battery,weight,noise_cancellation,wireless_charging,best_for,affiliate_url) VALUES
('sony','Sony WH-1000XM5 Wireless Headphones','Sony',(SELECT id FROM categories WHERE name='Audio'),9.6,4812,349.99,'BEST OVERALL','https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=640&q=85','Industry-leading noise cancellation with a wonderfully comfortable, all-day fit.','30 hours','250 g',TRUE,TRUE,'Travel & focus','https://example.com'),
('amazfit','Amazfit GTR 4 Smart Watch','Amazfit',(SELECT id FROM categories WHERE name='Tech'),9.3,2145,167.99,'BEST VALUE','https://images.unsplash.com/photo-1544117519-31a4b719223d?auto=format&fit=crop&w=640&q=85','A polished health and fitness tracker with excellent battery life.','14 days','34 g',FALSE,TRUE,'Fitness tracking','https://example.com'),
('bose','Bose QuietComfort Earbuds II','Bose',(SELECT id FROM categories WHERE name='Audio'),9.2,1318,229,'PREMIUM PICK','https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=640&q=85','Compact earbuds with personalized sound and acclaimed active noise cancellation.','24 hours','59 g',TRUE,TRUE,'Everyday listening','https://example.com'),
('roomba','iRobot Roomba j7+ Robot Vacuum','iRobot',(SELECT id FROM categories WHERE name='Home'),9.1,983,799,'BEST FOR HOME','https://images.unsplash.com/photo-1579567761406-4684ee0c75b6?auto=format&fit=crop&w=640&q=85','A clever robot vacuum that learns your home and avoids common obstacles.','75 min','3.4 kg',FALSE,TRUE,'Busy homes','https://example.com'),
('canon','Canon EOS R50 Mirrorless Camera','Canon',(SELECT id FROM categories WHERE name='Tech'),8.9,1527,679,'BEST FOR BEGINNERS','https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=640&q=85','An approachable mirrorless camera that makes polished photos and video easy.','440 shots','375 g',FALSE,TRUE,'New creators','https://example.com') ON CONFLICT (id) DO NOTHING;