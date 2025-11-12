# Weekly Digest Advert Library

Use this file to manage the short sponsor highlights that appear in weekly emails. Each entry should follow the format below. Keep copy short (one or two sentences) and positive.

Each weekly email includes a single advert block. To show more than one, we’d need to modify the script to return multiple entries and update the template accordingly.

## Image Guidelines
- Host logos on a reliable HTTPS URL.
- Recommended size: 600 × 200 px (transparent PNG preferred). Smaller images are fine; the email will display alt text if images are blocked.
- Provide accessible `alt` text describing the sponsor.

## Allowed Values
- **Regions:** Central, Eastern, London & South East, East Midlands, West Midlands, North East, North West, Scotland, South, South West, Wales, Yorkshire & Humber  
- **Disciplines:** Road, Track, BMX, MTB, Cyclo Cross, Speedway, Time Trial, Hill Climb

## Entry Template
```
## {{Advert Title}}
- **Text:** Short copy promoting the sponsor (max 200 characters).
- **Logo URL:** https://example.com/path/logo.png
- **Alt text:** Describe the image for screen readers.
- **Regions:** Central, Eastern (comma-separated list; use "All" for nationwide)
- **Disciplines:** BMX, Road (comma-separated; use "All" if not specific)
- **Priority:** normal (options: high, normal, low)
```

Add as many entries as you like; the automation will pick the highest-priority advert that matches at least one subscriber region or discipline. If nothing matches, the digest falls back to the default message defined in the script.

## Devil's Bykes
- **Text:** Serving cyclists across Brighton & Hove.
- **Logo URL:** https://c.yell.com/t_bigSquare,f_auto/6e8224b1-afbf-41d4-8ef4-2a177832d4ca_image_jpeg.jpg
- **Alt text:** Devils Bykes Logo
- **Regions:** All
- **Disciplines:** All
- **Priority:** normal