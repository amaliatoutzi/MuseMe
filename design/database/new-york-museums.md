# Question

You are a data researcher and formatter. Build a JSON database of museums in New York City.

## Scope
- Geography: New York City (5 boroughs).
- Entities: Museums (art, history, science, children’s, design, photography, etc.). Exclude galleries that are not museums, temporary pop-ups, and venues whose primary business is not a museum.
- Exhibits: Pull from **official museum websites** (preferred) or their official collection/exhibitions portals. Do **not** invent exhibits.

## Data Sources (for ratings and verification)
- Cross-check names and addresses with the museum’s official website or Wikipedia when possible.
- **Exhibits**: Official museum site/collection pages only. If you can’t verify on an official source, **omit the exhibit**.
- Every URL must be http/https and resolvable.

## Fields (per museum)
- id: string  // stable slug, e.g., "the-metropolitan-museum-of-art"
- name: string
- address: string
- zip: string  // 5-digit ZIP
- borough: string  // Manhattan, Brooklyn, Queens, Bronx, Staten Island
- location: { lat: number, lon: number }  // decimal degrees
- website: string  // official site if available
- tags: string[]  // choose 3–6 from the preset tag vocabulary below
- exhibits: Exhibit[]       // array; see schema below

## Exhibit object (fields)
- id: string                // lowercase, dashed slug of exhibit name; unique within museum
- name: string
- type: string              // "Permanent" | "Temporary" | "CollectionHighlight"
- gallery?: string          // optional gallery/room label if shown on site
- start_date?: string       // ISO 8601 (Temporary only, if available)
- end_date?: string         // ISO 8601 (Temporary only, if available)

## Preset Tag Vocabulary (choose only from this list)
["Art","Contemporary","Modern","Classical","Sculpture","Photography","Design",
 "History","Science","Children","NaturalHistory","Technology","Maritime",
 "Immigration","AfricanAmerican","Asian","Hispanic","American",
 "Aviation","Transit","PerformingArts","Film","Architecture","Literature"]

## Requirements
- Output a single **JSON array** of objects (no trailing text).
- Include 30–50 museums, prioritizing the most visited/recognized first.
- Deduplicate by normalized name + address (case/whitespace-insensitive).
- Normalize ZIP to 5 digits; normalize borough to the set above.
- Pick 3–6 tags per museum from the vocabulary; do not invent new tags.
- Keep `id` lowercase with dashes: slugify(name).
- Validate all URLs (http/https). No relative links.
- Fill ALL fields; do not use nulls.
- Exhibits:
  - For large museums, include **10–30** notable exhibits: all current **Temporary** exhibitions (if any) + representative **Permanent/CollectionHighlight** entries.
  - If the museum site doesn’t list exhibits clearly, set `exhibits: []`.
- `id` fields (museum/exhibit) are lowercase, dashed slugs; ensure exhibit IDs are unique **per museum**.

## Ordering
- Sort alphabetically by name.

## Quality Checks (perform before you output)
- JSON must be valid and parseable.
- No duplicate ids or names+zip pairs.
- All tags ∈ preset vocabulary.
- zip matches U.S. ZIP regex: ^\\d{5}$
- location lat ∈ [-90,90], lon ∈ [-180,180].
- For Temporary exhibits, if dates are shown, include ISO `start_date`/`end_date`; otherwise omit those fields.

## Final Output
Return only the JSON array. No commentary.

# response:

```json
[
  {
    "id": "alice-austen-house-museum",
    "name": "Alice Austen House Museum",
    "address": "2 Hylan Boulevard",
    "zip": "10305",
    "borough": "Staten Island",
    "location": {
      "lat": 40.5975,
      "lon": -74.0732
    },
    "website": "https://aliceausten.org/",
    "tags": [
      "Photography",
      "History",
      "American",
      "Art"
    ],
    "exhibits": [
      {
        "id": "alice-austen-and-the-old-house",
        "name": "Alice Austen and The Old House",
        "type": "Permanent"
      },
      {
        "id": "the-story-of-the-house",
        "name": "The Story of the House",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "american-museum-of-natural-history",
    "name": "American Museum of Natural History",
    "address": "200 Central Park West",
    "zip": "10024",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7813,
      "lon": -73.9739
    },
    "website": "https://www.amnh.org/",
    "tags": [
      "NaturalHistory",
      "Science",
      "Children",
      "History",
      "American"
    ],
    "exhibits": [
      {
        "id": "permanent-dinosaur-halls",
        "name": "Permanent Dinosaur Halls",
        "type": "Permanent",
        "gallery": "4th Floor"
      },
      {
        "id": "milstein-hall-of-ocean-life",
        "name": "Milstein Hall of Ocean Life",
        "type": "Permanent",
        "gallery": "1st Floor"
      },
      {
        "id": "spaceland",
        "name": "Spaceland",
        "type": "Temporary",
        "start_date": "2024-03-23",
        "end_date": "2025-01-05"
      },
      {
        "id": "sharks",
        "name": "Sharks",
        "type": "Temporary",
        "start_date": "2024-03-01",
        "end_date": "2024-09-02"
      },
      {
        "id": "gems-and-minerals-hall",
        "name": "Allison and Roberto Mignone Halls of Gems and Minerals",
        "type": "Permanent",
        "gallery": "1st Floor"
      },
      {
        "id": "mammals-of-north-america",
        "name": "North American Mammals",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "asia-society-and-museum",
    "name": "Asia Society and Museum",
    "address": "725 Park Avenue",
    "zip": "10021",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7735,
      "lon": -73.9649
    },
    "website": "https://asiasociety.org/new-york/museum",
    "tags": [
      "Art",
      "Asian",
      "History",
      "Contemporary"
    ],
    "exhibits": [
      {
        "id": "monks-merchants-and-masters-highlights-from-the-collection",
        "name": "Monks, Merchants, and Masters: Highlights from the Collection",
        "type": "CollectionHighlight"
      },
      {
        "id": "permanent-collection-galleries",
        "name": "Permanent Collection Galleries",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "bartow-pell-mansion-museum",
    "name": "Bartow-Pell Mansion Museum",
    "address": "895 Shore Road",
    "zip": "10464",
    "borough": "Bronx",
    "location": {
      "lat": 40.8655,
      "lon": -73.7997
    },
    "website": "https://www.bartowpellmansionmuseum.org/",
    "tags": [
      "History",
      "Architecture",
      "Design",
      "American"
    ],
    "exhibits": [
      {
        "id": "the-mansion-restoration",
        "name": "The Mansion & Restoration",
        "type": "Permanent"
      },
      {
        "id": "the-historic-gardens",
        "name": "The Historic Gardens",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "bronx-museum-of-art",
    "name": "Bronx Museum of Art",
    "address": "1040 Grand Concourse",
    "zip": "10456",
    "borough": "Bronx",
    "location": {
      "lat": 40.8272,
      "lon": -73.9213
    },
    "website": "https://www.bronxmuseum.org/",
    "tags": [
      "Art",
      "Contemporary",
      "AfricanAmerican",
      "Hispanic",
      "American"
    ],
    "exhibits": [
      {
        "id": "jude-coleridge-where-the-soil-is-rich",
        "name": "Jude Coleridge: Where the Soil is Rich",
        "type": "Temporary",
        "start_date": "2024-03-27",
        "end_date": "2024-07-28"
      },
      {
        "id": "what-makes-a-home-interviews-with-bronx-artists",
        "name": "What Makes a Home: Interviews with Bronx Artists",
        "type": "Temporary",
        "start_date": "2024-03-27",
        "end_date": "2024-07-28"
      },
      {
        "id": "highlights-from-the-permanent-collection",
        "name": "Highlights from the Permanent Collection",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "brooklyn-childrens-museum",
    "name": "Brooklyn Children's Museum",
    "address": "145 Brooklyn Avenue",
    "zip": "11213",
    "borough": "Brooklyn",
    "location": {
      "lat": 40.6749,
      "lon": -73.9410
    },
    "website": "https://www.brooklynkids.org/",
    "tags": [
      "Children",
      "Science",
      "Art",
      "History",
      "AfricanAmerican"
    ],
    "exhibits": [
      {
        "id": "totally-tots",
        "name": "Totally Tots",
        "type": "Permanent"
      },
      {
        "id": "world-brooklyn",
        "name": "World Brooklyn",
        "type": "Permanent"
      },
      {
        "id": "neighborhood-nature",
        "name": "Neighborhood Nature",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "brooklyn-museum",
    "name": "Brooklyn Museum",
    "address": "200 Eastern Parkway",
    "zip": "11238",
    "borough": "Brooklyn",
    "location": {
      "lat": 40.6710,
      "lon": -73.9637
    },
    "website": "https://www.brooklynmuseum.org/",
    "tags": [
      "Art",
      "History",
      "Contemporary",
      "Classical",
      "AfricanAmerican",
      "American"
    ],
    "exhibits": [
      {
        "id": "giancarlo-montana-what-the-birds-know",
        "name": "Giancarlo Montana: What the Birds Know",
        "type": "Temporary",
        "start_date": "2024-02-16",
        "end_date": "2024-07-28"
      },
      {
        "id": "egyptian-art",
        "name": "Egyptian Art",
        "type": "Permanent"
      },
      {
        "id": "arts-of-africa",
        "name": "Arts of Africa",
        "type": "Permanent"
      },
      {
        "id": "american-art-galleries",
        "name": "American Art Galleries",
        "type": "Permanent"
      },
      {
        "id": "feminist-art-collection-the-dinner-party",
        "name": "Feminist Art Collection: The Dinner Party",
        "type": "Permanent",
        "gallery": "Elizabeth A. Sackler Center for Feminist Art"
      },
      {
        "id": "a-new-view-of-arts-of-the-americas",
        "name": "A New View of Arts of the Americas",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "childrens-museum-of-manhattan",
    "name": "Children's Museum of Manhattan",
    "address": "212 West 83rd Street",
    "zip": "10024",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7865,
      "lon": -73.9780
    },
    "website": "https://cmom.org/",
    "tags": [
      "Children",
      "Science",
      "Technology",
      "Art"
    ],
    "exhibits": [
      {
        "id": "dynasty-arts-of-china",
        "name": "Dynasty: Arts of China",
        "type": "Permanent"
      },
      {
        "id": "playworks",
        "name": "PlayWorks",
        "type": "Permanent"
      },
      {
        "id": "city-senz",
        "name": "City Sensations",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "childrens-museum-of-the-arts",
    "name": "Children's Museum of the Arts",
    "address": "103 Charlton Street",
    "zip": "10014",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7275,
      "lon": -74.0048
    },
    "website": "https://cmany.org/",
    "tags": [
      "Children",
      "Art",
      "Design",
      "Contemporary"
    ],
    "exhibits": [
      {
        "id": "the-wonder-of-collage",
        "name": "The Wonder of Collage",
        "type": "Temporary",
        "start_date": "2024-01-20",
        "end_date": "2024-05-12"
      }
    ]
  },
  {
    "id": "cooper-hewitt-smithsonian-design-museum",
    "name": "Cooper Hewitt, Smithsonian Design Museum",
    "address": "2 East 91st Street",
    "zip": "10128",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7844,
      "lon": -73.9575
    },
    "website": "https://www.cooperhewitt.org/",
    "tags": [
      "Design",
      "Art",
      "History",
      "Architecture",
      "Technology"
    ],
    "exhibits": [
      {
        "id": "exquisite-creatures-the-art-of-animal-anatomy",
        "name": "Exquisite Creatures: The Art of Animal Anatomy",
        "type": "Temporary",
        "start_date": "2023-11-23",
        "end_date": "2024-09-08"
      },
      {
        "id": "alexis-rockman-manifest-destiny",
        "name": "Alexis Rockman: Manifest Destiny",
        "type": "Temporary",
        "start_date": "2024-03-01",
        "end_date": "2024-08-11"
      },
      {
        "id": "the-drawings-room",
        "name": "The Drawings Room",
        "type": "Permanent"
      },
      {
        "id": "design-for-the-people",
        "name": "Design for the People",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "dyckman-farmhouse-museum",
    "name": "Dyckman Farmhouse Museum",
    "address": "4881 Broadway",
    "zip": "10034",
    "borough": "Manhattan",
    "location": {
      "lat": 40.8674,
      "lon": -73.9213
    },
    "website": "https://dyckmanfarmhouse.org/",
    "tags": [
      "History",
      "American",
      "Architecture"
    ],
    "exhibits": [
      {
        "id": "the-farmhouse-tour",
        "name": "The Farmhouse Tour",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "edgar-allan-poe-cottage",
    "name": "Edgar Allan Poe Cottage",
    "address": "2640 Grand Concourse",
    "zip": "10458",
    "borough": "Bronx",
    "location": {
      "lat": 40.8687,
      "lon": -73.8967
    },
    "website": "https://bronxhistoricalsociety.org/poe-cottage/",
    "tags": [
      "History",
      "Literature",
      "American",
      "Architecture"
    ],
    "exhibits": [
      {
        "id": "poe-in-the-bronx",
        "name": "Poe in the Bronx",
        "type": "Permanent"
      },
      {
        "id": "the-cottage-interiors",
        "name": "The Cottage Interiors",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "el-museo-del-barrio",
    "name": "El Museo del Barrio",
    "address": "1230 Fifth Avenue",
    "zip": "10029",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7928,
      "lon": -73.9515
    },
    "website": "https://www.elmuseo.org/",
    "tags": [
      "Art",
      "Hispanic",
      "Contemporary",
      "American",
      "History"
    ],
    "exhibits": [
      {
        "id": "el-museo-del-barrio-s-permanent-collection",
        "name": "El Museo del Barrio’s Permanent Collection",
        "type": "Permanent"
      },
      {
        "id": "estrellita-brodsky-collection",
        "name": "Estrellita Brodsky Collection",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "flushing-town-hall",
    "name": "Flushing Town Hall",
    "address": "137-35 Northern Boulevard",
    "zip": "11354",
    "borough": "Queens",
    "location": {
      "lat": 40.7644,
      "lon": -73.8237
    },
    "website": "https://www.flushingtownhall.org/",
    "tags": [
      "PerformingArts",
      "History",
      "Art",
      "American",
      "Asian"
    ],
    "exhibits": [
      {
        "id": "galleries-and-exhibitions",
        "name": "Galleries and Exhibitions",
        "type": "Permanent"
      },
      {
        "id": "the-landmark-building",
        "name": "The Landmark Building",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "fraunces-tavern-museum",
    "name": "Fraunces Tavern Museum",
    "address": "54 Pearl Street",
    "zip": "10004",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7032,
      "lon": -74.0110
    },
    "website": "https://www.frauncestavernmuseum.org/",
    "tags": [
      "History",
      "American",
      "Architecture",
      "Classical"
    ],
    "exhibits": [
      {
        "id": "george-washington-s-farewell-to-his-officers",
        "name": "George Washington’s Farewell to his Officers",
        "type": "Permanent"
      },
      {
        "id": "the-long-room",
        "name": "The Long Room",
        "type": "Permanent",
        "gallery": "Second Floor"
      },
      {
        "id": "john-fraunces-and-his-tavern",
        "name": "John Fraunces and His Tavern",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "green-wood-cemetery",
    "name": "Green-Wood Cemetery",
    "address": "500 25th Street",
    "zip": "11232",
    "borough": "Brooklyn",
    "location": {
      "lat": 40.6622,
      "lon": -73.9936
    },
    "website": "https://www.green-wood.com/",
    "tags": [
      "History",
      "Architecture",
      "Art",
      "American",
      "Sculpture"
    ],
    "exhibits": [
      {
        "id": "architecture-and-mausoleums",
        "name": "Architecture and Mausoleums",
        "type": "Permanent"
      },
      {
        "id": "sculpture-and-monuments",
        "name": "Sculpture and Monuments",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "hispanic-society-museum-and-library",
    "name": "Hispanic Society Museum & Library",
    "address": "613 West 155th Street",
    "zip": "10032",
    "borough": "Manhattan",
    "location": {
      "lat": 40.8290,
      "lon": -73.9450
    },
    "website": "https://hispanicsociety.org/",
    "tags": [
      "Art",
      "Hispanic",
      "History",
      "Classical",
      "Literature"
    ],
    "exhibits": [
      {
        "id": "permanent-collection-highlights",
        "name": "Permanent Collection Highlights",
        "type": "CollectionHighlight"
      },
      {
        "id": "the-sorolla-vision-of-spain-gallery",
        "name": "The Sorolla Vision of Spain Gallery",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "intrepid-sea-air-and-space-museum",
    "name": "Intrepid Sea, Air & Space Museum",
    "address": "Pier 86, West 46th Street",
    "zip": "10036",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7645,
      "lon": -74.0003
    },
    "website": "https://www.intrepidmuseum.org/",
    "tags": [
      "Maritime",
      "Aviation",
      "Technology",
      "History",
      "Science",
      "American"
    ],
    "exhibits": [
      {
        "id": "space-shuttle-enterprise",
        "name": "Space Shuttle Enterprise",
        "type": "Permanent"
      },
      {
        "id": "concorde-supersonic-jet",
        "name": "Concorde Supersonic Jet",
        "type": "Permanent"
      },
      {
        "id": "submarine-growler",
        "name": "Submarine Growler",
        "type": "Permanent"
      },
      {
        "id": "the-intrepid-experience",
        "name": "The Intrepid Experience",
        "type": "Permanent",
        "gallery": "Hangar 1"
      },
      {
        "id": "military-aircraft-collection",
        "name": "Military Aircraft Collection",
        "type": "Permanent",
        "gallery": "Flight Deck"
      }
    ]
  },
  {
    "id": "leslie-lohman-museum-of-art",
    "name": "Leslie-Lohman Museum of Art",
    "address": "26 Wooster Street",
    "zip": "10013",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7251,
      "lon": -74.0023
    },
    "website": "https://leslielohman.org/",
    "tags": [
      "Art",
      "Contemporary",
      "Photography",
      "American"
    ],
    "exhibits": [
      {
        "id": "queer-love-a-century-of-lgbtq-art",
        "name": "Queer Love: A Century of LGBTQ+ Art",
        "type": "Temporary",
        "start_date": "2024-02-09",
        "end_date": "2024-05-12"
      },
      {
        "id": "art-and-activism",
        "name": "Art and Activism",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "louis-armstrong-house-museum",
    "name": "Louis Armstrong House Museum",
    "address": "34-56 107th Street",
    "zip": "11368",
    "borough": "Queens",
    "location": {
      "lat": 40.7516,
      "lon": -73.8407
    },
    "website": "https://www.louisarmstronghouse.org/",
    "tags": [
      "History",
      "PerformingArts",
      "American"
    ],
    "exhibits": [
      {
        "id": "the-armstrong-home",
        "name": "The Armstrong Home",
        "type": "Permanent"
      },
      {
        "id": "satchmo-the-life-of-louis-armstrong",
        "name": "Satchmo: The Life of Louis Armstrong",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "merchants-house-museum",
    "name": "Merchant's House Museum",
    "address": "29 East 4th Street",
    "zip": "10003",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7265,
      "lon": -73.9922
    },
    "website": "https://merchantshouse.org/",
    "tags": [
      "History",
      "American",
      "Architecture",
      "Design"
    ],
    "exhibits": [
      {
        "id": "the-tredwell-family-home",
        "name": "The Tredwell Family Home",
        "type": "Permanent"
      },
      {
        "id": "the-tredwell-costume-collection",
        "name": "The Tredwell Costume Collection",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "moma-ps1",
    "name": "MoMA PS1",
    "address": "22-25 Jackson Avenue",
    "zip": "11101",
    "borough": "Queens",
    "location": {
      "lat": 40.7460,
      "lon": -73.9472
    },
    "website": "https://www.moma.org/visit/moma-ps1",
    "tags": [
      "Art",
      "Contemporary",
      "Modern"
    ],
    "exhibits": [
      {
        "id": "lizzie-fitch-ryan-trecartin-or-ryan",
        "name": "Lizzie Fitch / Ryan Trecartin: OR RYAN",
        "type": "Temporary",
        "start_date": "2024-02-18",
        "end_date": "2024-09-02"
      },
      {
        "id": "chloe-wise-all-her-boys",
        "name": "Chloe Wise: All Her Boys",
        "type": "Temporary",
        "start_date": "2024-02-18",
        "end_date": "2024-09-02"
      },
      {
        "id": "permanent-installations",
        "name": "Permanent Installations",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "museum-at-eldridge-street",
    "name": "Museum at Eldridge Street",
    "address": "12 Eldridge Street",
    "zip": "10002",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7154,
      "lon": -73.9934
    },
    "website": "https://www.eldridgestreet.org/",
    "tags": [
      "History",
      "American",
      "Architecture",
      "Classical"
    ],
    "exhibits": [
      {
        "id": "the-1887-synagogue",
        "name": "The 1887 Synagogue",
        "type": "Permanent"
      },
      {
        "id": "the-story-of-immigrant-new-york",
        "name": "The Story of Immigrant New York",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "museum-of-american-finance",
    "name": "Museum of American Finance",
    "address": "48 Wall Street",
    "zip": "10005",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7067,
      "lon": -74.0091
    },
    "website": "https://www.moaf.org/",
    "tags": [
      "History",
      "American",
      "Technology",
      "Design"
    ],
    "exhibits": [
      {
        "id": "the-history-of-money",
        "name": "The History of Money",
        "type": "Permanent"
      },
      {
        "id": "entrepreneurs-game-changers",
        "name": "Entrepreneurs: Game Changers",
        "type": "Permanent"
      },
      {
        "id": "america-s-first-banks",
        "name": "America's First Banks",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "museum-of-arts-and-design",
    "name": "Museum of Arts and Design",
    "address": "2 Columbus Circle",
    "zip": "10019",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7684,
      "lon": -73.9818
    },
    "website": "https://madmuseum.org/",
    "tags": [
      "Design",
      "Art",
      "Contemporary",
      "Sculpture"
    ],
    "exhibits": [
      {
        "id": "fashion-and-the-modern-body",
        "name": "Fashion and the Modern Body",
        "type": "Temporary",
        "start_date": "2023-11-09",
        "end_date": "2024-03-24"
      },
      {
        "id": "the-mad-collection",
        "name": "The MAD Collection",
        "type": "Permanent"
      },
      {
        "id": "new-terrains-contemporary-art-ceramics",
        "name": "New Terrains: Contemporary Art Ceramics",
        "type": "Temporary",
        "start_date": "2024-03-23",
        "end_date": "2024-09-22"
      }
    ]
  },
  {
    "id": "museum-of-chinese-in-america",
    "name": "Museum of Chinese in America",
    "address": "215 Centre Street",
    "zip": "10013",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7188,
      "lon": -73.9972
    },
    "website": "https://www.mocanyc.org/",
    "tags": [
      "History",
      "Asian",
      "American",
      "Art"
    ],
    "exhibits": [
      {
        "id": "permanent-exhibition-with-a-single-voice-chinese-americans-in-new-york",
        "name": "Permanent Exhibition: With a Single Voice: Chinese Americans in New York",
        "type": "Permanent"
      },
      {
        "id": "family-albums-chinese-americans-and-the-photography-of-everyday-life",
        "name": "Family Albums: Chinese Americans and the Photography of Everyday Life",
        "type": "Temporary",
        "start_date": "2024-01-25",
        "end_date": "2024-09-08"
      }
    ]
  },
  {
    "id": "museum-of-jewish-heritage-a-living-memorial-to-the-holocaust",
    "name": "Museum of Jewish Heritage – A Living Memorial to the Holocaust",
    "address": "36 Battery Place",
    "zip": "10280",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7042,
      "lon": -74.0180
    },
    "website": "https://mjhnyc.org/",
    "tags": [
      "History",
      "American",
      "Photography",
      "Architecture"
    ],
    "exhibits": [
      {
        "id": "the-holocaust-what-hate-can-do",
        "name": "The Holocaust: What Hate Can Do",
        "type": "Permanent"
      },
      {
        "id": "auschwitz-not-long-ago-not-far-away",
        "name": "Auschwitz. Not long ago. Not far away.",
        "type": "Temporary",
        "start_date": "2019-05-08",
        "end_date": "2024-08-30"
      },
      {
        "id": "the-mandels-of-wien",
        "name": "The Mandels of Wien",
        "type": "Temporary",
        "start_date": "2024-01-21",
        "end_date": "2024-05-19"
      }
    ]
  },
  {
    "id": "museum-of-modern-art",
    "name": "Museum of Modern Art",
    "address": "11 West 53rd Street",
    "zip": "10019",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7614,
      "lon": -73.9776
    },
    "website": "https://www.moma.org/",
    "tags": [
      "Art",
      "Modern",
      "Contemporary",
      "Photography",
      "Design"
    ],
    "exhibits": [
      {
        "id": "ka-kweng-yung-a-way-with-art",
        "name": "Ka-Kweng Yung: A Way with Art",
        "type": "Temporary",
        "start_date": "2024-01-28",
        "end_date": "2024-06-23"
      },
      {
        "id": "permanent-collection-galleries",
        "name": "Permanent Collection Galleries",
        "type": "Permanent"
      },
      {
        "id": "starry-night",
        "name": "The Starry Night",
        "type": "CollectionHighlight",
        "gallery": "Floor 5"
      },
      {
        "id": "les-demoiselles-davignon",
        "name": "Les Demoiselles d'Avignon",
        "type": "CollectionHighlight",
        "gallery": "Floor 5"
      },
      {
        "id": "new-york-a-photographers-city",
        "name": "New York: A Photographer's City",
        "type": "Temporary",
        "start_date": "2023-09-23",
        "end_date": "2024-06-16"
      },
      {
        "id": "wolfgang-tillmans-to-look-without-fear",
        "name": "Wolfgang Tillmans: To look without fear",
        "type": "Temporary",
        "start_date": "2023-09-10",
        "end_date": "2024-05-27"
      }
    ]
  },
  {
    "id": "museum-of-the-city-of-new-york",
    "name": "Museum of the City of New York",
    "address": "1220 Fifth Avenue",
    "zip": "10029",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7937,
      "lon": -73.9507
    },
    "website": "https://www.mcny.org/",
    "tags": [
      "History",
      "American",
      "Architecture",
      "Photography"
    ],
    "exhibits": [
      {
        "id": "new-york-at-its-core",
        "name": "New York at Its Core",
        "type": "Permanent"
      },
      {
        "id": "this-is-new-york-100-years-of-the-city-in-art-and-pop-culture",
        "name": "This is New York: 100 Years of the City in Art and Pop Culture",
        "type": "Temporary",
        "start_date": "2024-02-16",
        "end_date": "2024-07-21"
      },
      {
        "id": "george-balanchine-s-the-nutcracker-the-exhibition",
        "name": "George Balanchine's The Nutcracker: The Exhibition",
        "type": "Temporary",
        "start_date": "2023-11-09",
        "end_date": "2024-04-14"
      },
      {
        "id": "activist-new-york",
        "name": "Activist New York",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "museum-of-the-moving-image",
    "name": "Museum of the Moving Image",
    "address": "36-01 35th Avenue",
    "zip": "11106",
    "borough": "Queens",
    "location": {
      "lat": 40.7570,
      "lon": -73.9238
    },
    "website": "https://movingimage.us/",
    "tags": [
      "Film",
      "Technology",
      "History",
      "PerformingArts",
      "American"
    ],
    "exhibits": [
      {
        "id": "behind-the-screen",
        "name": "Behind the Screen",
        "type": "Permanent"
      },
      {
        "id": "the-jim-henson-exhibition",
        "name": "The Jim Henson Exhibition",
        "type": "Permanent"
      },
      {
        "id": "the-horror-dreamland-a-nightmare-created",
        "name": "The Horror: Dreamland, A Nightmare Created",
        "type": "Temporary",
        "start_date": "2023-10-27",
        "end_date": "2024-04-14"
      },
      {
        "id": "videogame-exhibition",
        "name": "Videogame Exhibition",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "national-museum-of-the-american-indian-new-york",
    "name": "National Museum of the American Indian - New York",
    "address": "1 Bowling Green",
    "zip": "10004",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7047,
      "lon": -74.0139
    },
    "website": "https://americanindian.si.edu/visit/newyork",
    "tags": [
      "History",
      "American",
      "Art",
      "Classical",
      "Sculpture"
    ],
    "exhibits": [
      {
        "id": "infinity-of-nations-art-and-history-in-the-collections-of-the-national-museum-of-the-american-indian",
        "name": "Infinity of Nations: Art and History in the Collections of the National Museum of the American Indian",
        "type": "Permanent"
      },
      {
        "id": "ancestral-narratives",
        "name": "Ancestral Narratives",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "national-september-11-memorial-and-museum",
    "name": "National September 11 Memorial & Museum",
    "address": "180 Greenwich Street",
    "zip": "10007",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7115,
      "lon": -74.0125
    },
    "website": "https://www.911memorial.org/",
    "tags": [
      "History",
      "American",
      "Technology",
      "Architecture"
    ],
    "exhibits": [
      {
        "id": "historical-exhibition",
        "name": "Historical Exhibition",
        "type": "Permanent"
      },
      {
        "id": "memorial-exhibition",
        "name": "Memorial Exhibition",
        "type": "Permanent"
      },
      {
        "id": "foundation-hall",
        "name": "Foundation Hall",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "new-museum-of-contemporary-art",
    "name": "New Museum of Contemporary Art",
    "address": "235 Bowery",
    "zip": "10002",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7224,
      "lon": -73.9928
    },
    "website": "https://www.newmuseum.org/",
    "tags": [
      "Art",
      "Contemporary",
      "Modern",
      "Design"
    ],
    "exhibits": [
      {
        "id": "s-r-w-curtain-of-light",
        "name": "S. R. W. : Curtain of Light",
        "type": "Temporary",
        "start_date": "2024-02-15",
        "end_date": "2024-06-02"
      },
      {
        "id": "okwui-enwezor-ghost-in-the-machine",
        "name": "Okwui Enwezor: Ghost in the Machine",
        "type": "Temporary",
        "start_date": "2024-02-15",
        "end_date": "2024-06-02"
      },
      {
        "id": "new-art-exhibitions",
        "name": "New Art Exhibitions",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "new-york-city-fire-museum",
    "name": "New York City Fire Museum",
    "address": "278 Spring Street",
    "zip": "10013",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7259,
      "lon": -74.0040
    },
    "website": "https://www.nycfiremuseum.org/",
    "tags": [
      "History",
      "Technology",
      "American",
      "Children"
    ],
    "exhibits": [
      {
        "id": "firefighting-history-of-nyc",
        "name": "Firefighting History of NYC",
        "type": "Permanent"
      },
      {
        "id": "9-11-memorial-exhibit",
        "name": "9/11 Memorial Exhibit",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "new-york-hall-of-science",
    "name": "New York Hall of Science",
    "address": "47-01 111th Street",
    "zip": "11368",
    "borough": "Queens",
    "location": {
      "lat": 40.7460,
      "lon": -73.8465
    },
    "website": "https://nysci.org/",
    "tags": [
      "Science",
      "Technology",
      "Children",
      "Design"
    ],
    "exhibits": [
      {
        "id": "connecticon",
        "name": "ConnectiCon",
        "type": "Permanent"
      },
      {
        "id": "design-lab",
        "name": "Design Lab",
        "type": "Permanent"
      },
      {
        "id": "seeing-the-light",
        "name": "Seeing the Light",
        "type": "Permanent"
      },
      {
        "id": "maker-space",
        "name": "Maker Space",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "new-york-transit-museum",
    "name": "New York Transit Museum",
    "address": "99 Schermerhorn Street",
    "zip": "11201",
    "borough": "Brooklyn",
    "location": {
      "lat": 40.6900,
      "lon": -73.9840
    },
    "website": "https://www.nytransitmuseum.org/",
    "tags": [
      "Transit",
      "History",
      "Technology",
      "American"
    ],
    "exhibits": [
      {
        "id": "vintage-fleet",
        "name": "Vintage Fleet",
        "type": "Permanent"
      },
      {
        "id": "fare-collection-history",
        "name": "Fare Collection History",
        "type": "Permanent"
      },
      {
        "id": "moving-the-millions",
        "name": "Moving the Millions",
        "type": "Permanent"
      },
      {
        "id": "on-the-streets-subway-and-elevated",
        "name": "On the Streets: Subway and Elevated",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "new-york-historical-society",
    "name": "New-York Historical Society",
    "address": "170 Central Park West",
    "zip": "10024",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7785,
      "lon": -73.9731
    },
    "website": "https://www.nyhistory.org/",
    "tags": [
      "History",
      "American",
      "Art",
      "Photography"
    ],
    "exhibits": [
      {
        "id": "new-york-rising",
        "name": "New York Rising",
        "type": "Permanent"
      },
      {
        "id": "bill-brandt-henry-moore",
        "name": "Bill Brandt | Henry Moore",
        "type": "Temporary",
        "start_date": "2024-03-08",
        "end_date": "2024-07-21"
      },
      {
        "id": "audubon-s-birds-of-america",
        "name": "Audubon’s Birds of America",
        "type": "Permanent"
      },
      {
        "id": "the-hall-of-new-york-history",
        "name": "The Hall of New York History",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "pioneer-works",
    "name": "Pioneer Works",
    "address": "159 Pioneer Street",
    "zip": "11231",
    "borough": "Brooklyn",
    "location": {
      "lat": 40.6729,
      "lon": -74.0084
    },
    "website": "https://pioneerworks.org/",
    "tags": [
      "Art",
      "Contemporary",
      "Science",
      "Technology"
    ],
    "exhibits": [
      {
        "id": "current-exhibitions",
        "name": "Current Exhibitions",
        "type": "Temporary"
      },
      {
        "id": "artist-in-residence-showcase",
        "name": "Artist-in-Residence Showcase",
        "type": "Temporary"
      }
    ]
  },
  {
    "id": "queens-historical-society",
    "name": "Queens Historical Society",
    "address": "143-35 37th Avenue",
    "zip": "11354",
    "borough": "Queens",
    "location": {
      "lat": 40.7649,
      "lon": -73.8239
    },
    "website": "https://www.queenshistoricalsociety.org/",
    "tags": [
      "History",
      "American",
      "Architecture"
    ],
    "exhibits": [
      {
        "id": "kingsland-homestead-historic-house",
        "name": "Kingsland Homestead Historic House",
        "type": "Permanent"
      },
      {
        "id": "the-past-present-and-future-of-flushing",
        "name": "The Past, Present, and Future of Flushing",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "queens-museum",
    "name": "Queens Museum",
    "address": "Flushing Meadows Corona Park",
    "zip": "11368",
    "borough": "Queens",
    "location": {
      "lat": 40.7471,
      "lon": -73.8434
    },
    "website": "https://queensmuseum.org/",
    "tags": [
      "Art",
      "History",
      "Contemporary",
      "American"
    ],
    "exhibits": [
      {
        "id": "the-panorama-of-the-city-of-new-york",
        "name": "The Panorama of the City of New York",
        "type": "Permanent"
      },
      {
        "id": "growing-democracy",
        "name": "Growing Democracy",
        "type": "Permanent"
      },
      {
        "id": "el-artista-esta-aqui-artist-as-curator",
        "name": "El Artista Está Aquí: Artist as Curator",
        "type": "Temporary",
        "start_date": "2024-03-10",
        "end_date": "2024-09-08"
      },
      {
        "id": "queens-international-2023-sites-of-return",
        "name": "Queens International 2023: Sites of Return",
        "type": "Temporary",
        "start_date": "2023-11-12",
        "end_date": "2024-02-18"
      }
    ]
  },
  {
    "id": "schomburg-center-for-research-in-black-culture",
    "name": "Schomburg Center for Research in Black Culture",
    "address": "515 Malcolm X Blvd",
    "zip": "10037",
    "borough": "Manhattan",
    "location": {
      "lat": 40.8155,
      "lon": -73.9408
    },
    "website": "https://www.nypl.org/locations/schomburg",
    "tags": [
      "AfricanAmerican",
      "History",
      "Literature",
      "Art",
      "Photography"
    ],
    "exhibits": [
      {
        "id": "boundless-a-century-of-searing-art-and-poetry",
        "name": "Boundless: A Century of Searing Art and Poetry",
        "type": "Temporary",
        "start_date": "2024-02-14",
        "end_date": "2024-07-20"
      },
      {
        "id": "malcolm-x-history-collection",
        "name": "Malcolm X History Collection",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "skyscraper-museum",
    "name": "Skyscraper Museum",
    "address": "39 Battery Place",
    "zip": "10280",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7044,
      "lon": -74.0177
    },
    "website": "https://www.skyscraper.org/",
    "tags": [
      "Architecture",
      "History",
      "Design",
      "Technology",
      "American"
    ],
    "exhibits": [
      {
        "id": "housing-density",
        "name": "Housing Density",
        "type": "Permanent"
      },
      {
        "id": "ten-big-buildings",
        "name": "Ten Big Buildings",
        "type": "Permanent"
      },
      {
        "id": "world-trade-center-history",
        "name": "World Trade Center History",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "snug-harbor-cultural-center-and-botanical-garden",
    "name": "Snug Harbor Cultural Center & Botanical Garden",
    "address": "1000 Richmond Terrace",
    "zip": "10301",
    "borough": "Staten Island",
    "location": {
      "lat": 40.6433,
      "lon": -74.0863
    },
    "website": "https://snug-harbor.org/",
    "tags": [
      "Art",
      "History",
      "Children",
      "Design",
      "Asian"
    ],
    "exhibits": [
      {
        "id": "chinese-scholar-garden",
        "name": "Chinese Scholar Garden",
        "type": "Permanent"
      },
      {
        "id": "newhouse-center-for-contemporary-art",
        "name": "Newhouse Center for Contemporary Art",
        "type": "Permanent"
      },
      {
        "id": "botanical-gardens-collection",
        "name": "Botanical Gardens Collection",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "society-of-illustrators",
    "name": "Society of Illustrators",
    "address": "128 East 63rd Street",
    "zip": "10065",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7624,
      "lon": -73.9669
    },
    "website": "https://societyillustrators.org/",
    "tags": [
      "Art",
      "American",
      "Design",
      "Photography",
      "History"
    ],
    "exhibits": [
      {
        "id": "illustrators-66",
        "name": "Illustrators 66",
        "type": "Temporary",
        "start_date": "2024-01-24",
        "end_date": "2024-06-29"
      },
      {
        "id": "hall-of-fame-gallery",
        "name": "Hall of Fame Gallery",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "solomon-r-guggenheim-museum",
    "name": "Solomon R. Guggenheim Museum",
    "address": "1071 Fifth Avenue",
    "zip": "10128",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7829,
      "lon": -73.9589
    },
    "website": "https://www.guggenheim.org/",
    "tags": [
      "Art",
      "Modern",
      "Contemporary",
      "Architecture",
      "Sculpture"
    ],
    "exhibits": [
      {
        "id": "by-means-of-art-from-the-thannhauser-collection",
        "name": "By Means of Art: From the Thannhauser Collection",
        "type": "Permanent"
      },
      {
        "id": "going-rogue-the-art-of-the-early-modern",
        "name": "Going Rogue: The Art of the Early Modern",
        "type": "Temporary",
        "start_date": "2024-02-09",
        "end_date": "2024-05-12"
      },
      {
        "id": "invisible-cities",
        "name": "Invisible Cities",
        "type": "Temporary",
        "start_date": "2023-11-20",
        "end_date": "2024-04-14"
      },
      {
        "id": "on-the-line-walking-the-spiral-of-the-guggenheim",
        "name": "On the Line: Walking the Spiral of the Guggenheim",
        "type": "Permanent",
        "gallery": "Rotunda"
      },
      {
        "id": "the-masterworks-from-the-guggenheim-collection",
        "name": "The Masterworks from the Guggenheim Collection",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "south-street-seaport-museum",
    "name": "South Street Seaport Museum",
    "address": "12 Fulton Street",
    "zip": "10038",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7058,
      "lon": -74.0028
    },
    "website": "https://southstreetseaportmuseum.org/",
    "tags": [
      "Maritime",
      "History",
      "American",
      "Technology"
    ],
    "exhibits": [
      {
        "id": "millers-boatyard-built-boats",
        "name": "Miller's Boatyard: Built Boats",
        "type": "Permanent"
      },
      {
        "id": "south-street-seaport-museum-fleet",
        "name": "South Street Seaport Museum Fleet",
        "type": "Permanent"
      },
      {
        "id": "millermans-shop",
        "name": "The Millerman's Shop",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "spyscape",
    "name": "SPYSCAPE",
    "address": "928 8th Avenue",
    "zip": "10019",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7627,
      "lon": -73.9856
    },
    "website": "https://spyscape.com/",
    "tags": [
      "Technology",
      "History",
      "Science",
      "Design",
      "Contemporary"
    ],
    "exhibits": [
      {
        "id": "interactive-spy-challenges",
        "name": "Interactive Spy Challenges",
        "type": "Permanent"
      },
      {
        "id": "encryption-zone",
        "name": "Encryption Zone",
        "type": "Permanent"
      },
      {
        "id": "surveillance-zone",
        "name": "Surveillance Zone",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "staten-island-childrens-museum",
    "name": "Staten Island Children's Museum",
    "address": "1000 Richmond Terrace",
    "zip": "10301",
    "borough": "Staten Island",
    "location": {
      "lat": 40.6433,
      "lon": -74.0863
    },
    "website": "https://www.sichildrensmuseum.org/",
    "tags": [
      "Children",
      "Science",
      "Art",
      "Design"
    ],
    "exhibits": [
      {
        "id": "bugs-and-other-creatures",
        "name": "Bugs and Other Creatures",
        "type": "Permanent"
      },
      {
        "id": "build-it",
        "name": "Build It!",
        "type": "Permanent"
      },
      {
        "id": "wonder-wheel",
        "name": "Wonder Wheel",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "staten-island-museum",
    "name": "Staten Island Museum",
    "address": "1000 Richmond Terrace",
    "zip": "10301",
    "borough": "Staten Island",
    "location": {
      "lat": 40.6433,
      "lon": -74.0863
    },
    "website": "https://www.statenislandmuseum.org/",
    "tags": [
      "History",
      "NaturalHistory",
      "Art",
      "Science",
      "American"
    ],
    "exhibits": [
      {
        "id": "infinite-variations-from-the-permanent-collection",
        "name": "Infinite Variations from the Permanent Collection",
        "type": "Permanent"
      },
      {
        "id": "remember-the-staten-island-ferry",
        "name": "Remember the Staten Island Ferry",
        "type": "Permanent"
      },
      {
        "id": "staten-island-fossils-and-archaeology",
        "name": "Staten Island Fossils and Archaeology",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "tenement-museum",
    "name": "Tenement Museum",
    "address": "103 Orchard Street",
    "zip": "10002",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7186,
      "lon": -73.9902
    },
    "website": "https://www.tenement.org/",
    "tags": [
      "History",
      "Immigration",
      "American"
    ],
    "exhibits": [
      {
        "id": "irish-outsiders-and-the-story-of-the-levines",
        "name": "Irish Outsiders and the Story of the Levines",
        "type": "Permanent",
        "gallery": "103 Orchard Street"
      },
      {
        "id": "meet-the-residents-a-guided-tour",
        "name": "Meet the Residents: A Guided Tour",
        "type": "Permanent"
      },
      {
        "id": "under-one-roof",
        "name": "Under One Roof",
        "type": "Permanent",
        "gallery": "97 Orchard Street"
      }
    ]
  },
  {
    "id": "the-frick-collection",
    "name": "The Frick Collection",
    "address": "1 East 70th Street",
    "zip": "10021",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7712,
      "lon": -73.9669
    },
    "website": "https://www.frick.org/",
    "tags": [
      "Art",
      "Classical",
      "Sculpture",
      "American"
    ],
    "exhibits": [
      {
        "id": "permanent-collection-galleries",
        "name": "Permanent Collection Galleries",
        "type": "Permanent"
      },
      {
        "id": "vermeer-s-mistress-and-maid",
        "name": "Vermeer's Mistress and Maid",
        "type": "CollectionHighlight"
      },
      {
        "id": "frick-reframed",
        "name": "Frick Reframed",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "the-jewish-museum",
    "name": "The Jewish Museum",
    "address": "1109 Fifth Avenue",
    "zip": "10128",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7844,
      "lon": -73.9575
    },
    "website": "https://thejewishmuseum.org/",
    "tags": [
      "Art",
      "History",
      "American",
      "Design",
      "Classical"
    ],
    "exhibits": [
      {
        "id": "scenes-from-the-collection",
        "name": "Scenes from the Collection",
        "type": "Permanent"
      },
      {
        "id": "oskar-schlemmer-the-bauhaus-and-the-new-man",
        "name": "Oskar Schlemmer: The Bauhaus and the New Man",
        "type": "Temporary",
        "start_date": "2024-02-16",
        "end_date": "2024-05-27"
      },
      {
        "id": "feeling-manny-montage-for-a-future",
        "name": "Feeling Manny: Montage for a Future",
        "type": "Temporary",
        "start_date": "2024-02-16",
        "end_date": "2024-06-23"
      }
    ]
  },
  {
    "id": "the-metropolitan-museum-of-art",
    "name": "The Metropolitan Museum of Art",
    "address": "1000 Fifth Avenue",
    "zip": "10028",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7794,
      "lon": -73.9632
    },
    "website": "https://www.metmuseum.org/",
    "tags": [
      "Art",
      "Classical",
      "Sculpture",
      "American",
      "History"
    ],
    "exhibits": [
      {
        "id": "the-sultans-garden-of-the-imagination",
        "name": "The Sultan's Garden: The Imaginary Palace in Indian Painting",
        "type": "Temporary",
        "start_date": "2024-02-13",
        "end_date": "2024-07-14"
      },
      {
        "id": "the-american-wing",
        "name": "The American Wing",
        "type": "Permanent"
      },
      {
        "id": "ancient-egyptian-art",
        "name": "Ancient Egyptian Art",
        "type": "Permanent"
      },
      {
        "id": "european-sculpture-and-decorative-arts",
        "name": "European Sculpture and Decorative Arts",
        "type": "Permanent"
      },
      {
        "id": "impressionist-and-modern-art",
        "name": "Impressionist and Modern Art",
        "type": "Permanent"
      },
      {
        "id": "arms-and-armor",
        "name": "Arms and Armor",
        "type": "Permanent"
      },
      {
        "id": "the-temple-of-dendur",
        "name": "The Temple of Dendur",
        "type": "CollectionHighlight",
        "gallery": "The Sackler Wing"
      },
      {
        "id": "the-rococo-fantasy",
        "name": "The Rococo Fantasy: French Prints of the 18th Century",
        "type": "Temporary",
        "start_date": "2024-03-05",
        "end_date": "2024-07-14"
      },
      {
        "id": "the-costume-institute",
        "name": "The Costume Institute",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "the-morgan-library-and-museum",
    "name": "The Morgan Library & Museum",
    "address": "225 Madison Avenue",
    "zip": "10016",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7490,
      "lon": -73.9818
    },
    "website": "https://www.themorgan.org/",
    "tags": [
      "Art",
      "History",
      "Literature",
      "Classical",
      "Architecture"
    ],
    "exhibits": [
      {
        "id": "jean-jacques-lequeu-architect-of-madness",
        "name": "Jean-Jacques Lequeu: Architect of Madness",
        "type": "Temporary",
        "start_date": "2024-03-08",
        "end_date": "2024-06-02"
      },
      {
        "id": "the-making-of-j-p-morgan-s-library",
        "name": "The Making of J. Pierpont Morgan's Library",
        "type": "Permanent"
      },
      {
        "id": "medieval-and-renaissance-manuscripts",
        "name": "Medieval and Renaissance Manuscripts",
        "type": "CollectionHighlight"
      },
      {
        "id": "ink-stained-letters-and-literary-treasures",
        "name": "Ink-Stained Letters and Literary Treasures",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "the-new-york-earth-room",
    "name": "The New York Earth Room",
    "address": "141 Wooster Street",
    "zip": "10012",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7259,
      "lon": -74.0003
    },
    "website": "https://www.diaart.org/visit/visit-our-locations-sites/walter-de-maria-the-new-york-earth-room-new-york-united-states",
    "tags": [
      "Art",
      "Contemporary",
      "Sculpture",
      "Design",
      "Architecture"
    ],
    "exhibits": [
      {
        "id": "the-new-york-earth-room-by-walter-de-maria",
        "name": "The New York Earth Room by Walter De Maria",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "the-noguchi-museum",
    "name": "The Noguchi Museum",
    "address": "9-01 33rd Road",
    "zip": "11106",
    "borough": "Queens",
    "location": {
      "lat": 40.7667,
      "lon": -73.9538
    },
    "website": "https://www.noguchi.org/",
    "tags": [
      "Art",
      "Sculpture",
      "Design",
      "Contemporary",
      "Architecture"
    ],
    "exhibits": [
      {
        "id": "noguchi-permanent-collection",
        "name": "Noguchi Permanent Collection",
        "type": "Permanent"
      },
      {
        "id": "noguchi-s-sculpture-garden",
        "name": "Noguchi's Sculpture Garden",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "the-studio-museum-in-harlem",
    "name": "The Studio Museum in Harlem",
    "address": "144 West 125th Street",
    "zip": "10027",
    "borough": "Manhattan",
    "location": {
      "lat": 40.8115,
      "lon": -73.9482
    },
    "website": "https://www.studiomuseum.org/",
    "tags": [
      "Art",
      "AfricanAmerican",
      "Contemporary",
      "American"
    ],
    "exhibits": [
      {
        "id": "it-was-never-just-about-the-art",
        "name": "It Was Never Just About the Art",
        "type": "Temporary",
        "start_date": "2023-11-09",
        "end_date": "2024-03-10"
      },
      {
        "id": "collection-highlights",
        "name": "Collection Highlights",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "theodore-roosevelt-birthplace-national-historic-site",
    "name": "Theodore Roosevelt Birthplace National Historic Site",
    "address": "28 East 20th Street",
    "zip": "10003",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7380,
      "lon": -73.9893
    },
    "website": "https://www.nps.gov/thrb/index.htm",
    "tags": [
      "History",
      "American",
      "Architecture"
    ],
    "exhibits": [
      {
        "id": "theodore-roosevelt-childhood-home",
        "name": "Theodore Roosevelt Childhood Home",
        "type": "Permanent"
      },
      {
        "id": "life-and-legacy-of-theodore-roosevelt",
        "name": "Life and Legacy of Theodore Roosevelt",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "wave-hill",
    "name": "Wave Hill",
    "address": "4900 Independence Avenue",
    "zip": "10471",
    "borough": "Bronx",
    "location": {
      "lat": 40.7161,
      "lon": -73.9216
    },
    "website": "https://www.wavehill.org/",
    "tags": [
      "Art",
      "Design",
      "American",
      "Sculpture"
    ],
    "exhibits": [
      {
        "id": "glyndor-gallery-exhibitions",
        "name": "Glyndor Gallery Exhibitions",
        "type": "Temporary"
      },
      {
        "id": "wave-hill-gardens-art-installations",
        "name": "Wave Hill Gardens Art Installations",
        "type": "Permanent"
      }
    ]
  },
  {
    "id": "weeksville-heritage-center",
    "name": "Weeksville Heritage Center",
    "address": "158 Buffalo Avenue",
    "zip": "11213",
    "borough": "Brooklyn",
    "location": {
      "lat": 40.6720,
      "lon": -73.9312
    },
    "website": "https://www.weeksvilleseh.org/",
    "tags": [
      "AfricanAmerican",
      "History",
      "American",
      "Architecture"
    ],
    "exhibits": [
      {
        "id": "the-historic-houses",
        "name": "The Historic Houses",
        "type": "Permanent"
      },
      {
        "id": "still-here-black-lives-in-the-21st-century",
        "name": "Still Here: Black Lives in the 21st Century",
        "type": "Temporary",
        "start_date": "2024-02-15",
        "end_date": "2024-08-31"
      }
    ]
  },
  {
    "id": "whitney-museum-of-american-art",
    "name": "Whitney Museum of American Art",
    "address": "99 Gansevoort Street",
    "zip": "10014",
    "borough": "Manhattan",
    "location": {
      "lat": 40.7397,
      "lon": -74.0089
    },
    "website": "https://whitney.org/",
    "tags": [
      "Art",
      "American",
      "Contemporary",
      "Modern",
      "Photography"
    ],
    "exhibits": [
      {
        "id": "inheritance",
        "name": "Inheritance",
        "type": "Temporary",
        "start_date": "2023-10-18",
        "end_date": "2024-02-28"
      },
      {
        "id": "artists-choose-artists-selections-from-the-permanent-collection",
        "name": "Artists Choose Artists: Selections from the Permanent Collection",
        "type": "Permanent"
      },
      {
        "id": "eddy-kamau-nganga-is-this-the-place",
        "name": "Eddy Kamau Nganga: Is This The Place?",
        "type": "Temporary",
        "start_date": "2024-02-09",
        "end_date": "2024-05-26"
      },
      {
        "id": "trust-me",
        "name": "Trust Me",
        "type": "Temporary",
        "start_date": "2023-10-27",
        "end_date": "2024-03-03"
      },
      {
        "id": "the-collection-on-view",
        "name": "The Collection: On View",
        "type": "Permanent"
      }
    ]
  }
]
```
