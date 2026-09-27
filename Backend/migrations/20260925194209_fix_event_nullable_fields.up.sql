UPDATE events
SET
    slug = COALESCE(slug, ''),
    address = COALESCE(address, ''),
    city = COALESCE(city, ''),
    country = COALESCE(country, 'India'),
    cover_image = COALESCE(cover_image, ''),
    category = COALESCE(category, 'Music'),
    tags = COALESCE(tags, '{}'),
    visibility = COALESCE(visibility, 'public');