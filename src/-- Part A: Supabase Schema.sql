-- Part A: Supabase Schema

-- This table stores information about individual aftermarket parts.
-- The 'specifications' column uses JSONB for flexible, structured data.
CREATE TABLE parts (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name text NOT NULL,
    type text NOT NULL, -- e.g., 'Engine', 'Transmission', 'ECU'
    manufacturer text,
    specifications jsonb,
    created_at timestamptz DEFAULT now()
);

-- This table creates a many-to-many relationship, defining which
-- parts are compatible with which specific vehicles.
CREATE TABLE compatibility (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    part_id bigint NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    car_make text NOT NULL,
    car_model text NOT NULL,
    car_year_range text, -- e.g., '2002-2005'
    created_at timestamptz DEFAULT now()
);

-- Add indexes to frequently queried columns to improve performance.
CREATE INDEX idx_parts_type ON parts (type);
CREATE INDEX idx_compatibility_car ON compatibility (car_make, car_model);

-- Example Insertion statements:
-- INSERT INTO parts (name, type, manufacturer, specifications) VALUES
-- ('K20A2 Engine', 'Engine', 'Honda', '{"displacement": "2.0L", "horsepower": 200, "valvetrain": "DOHC i-VTEC"}'),
-- ('6-Speed Manual Transmission', 'Transmission', 'Honda', '{"gears": 6, "lsd": true}');

-- INSERT INTO compatibility (part_id, car_make, car_model, car_year_range) VALUES
-- (1, 'Acura', 'RSX Type-S', '2002-2004'),
-- (2, 'Acura', 'RSX Type-S', '2002-2004');
