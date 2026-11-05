# Telangana Soil Data Starter Package

## Included
- `data/raw/telangana_soil/district_registry.csv` — 33 Telangana district IDs/names.
- `data/raw/telangana_soil/district_soil_data_template.csv` — blank schema for measured or modelled district attributes. Blank cells are intentional, not zero.
- `data/raw/telangana_soil/source_register.csv` — official source links and limitations.
- `scripts/download_tgrac_soil_layer.py` — downloader for the public TGRAC ArcGIS soil polygon layer.

## Add to your existing project
Extract this ZIP into:
`C:\Users\DELL\Desktop\VS CODE\Lead_Research_Explorer`

Allow folders to merge. It will add the files under your existing `data` and `scripts` folders.

## Download TGRAC soil map data automatically
Open PowerShell in the project root and run:

```powershell
python scripts\download_tgrac_soil_layer.py
```

The script uses Python's standard library only. It writes:
- `data/raw/telangana_soil/tgrac_soil_map/tgrac_soil_polygons.geojson`
- `data/raw/telangana_soil/tgrac_soil_map/tgrac_soil_attributes.csv`
- `data/raw/telangana_soil/tgrac_soil_map/layer_metadata.json`

If your network blocks the government server, try another network or allow Python through the firewall.

## Scientific limitations
The TGRAC ArcGIS layer documents mapped soil polygons and soil-type labels (for example, alluvial, black, chalka and related classes). It is not a complete 33-district laboratory dataset. It does not itself supply measured pH, EC, organic carbon, Pb concentration, soil moisture, temperature or microbial abundance.

Do not fill missing values with invented district averages. Pb and microbial values must remain `not_available` until validated observations or a defensible model with documented inputs and uncertainty are available.

## Official source URLs
- TGRAC layer: https://tgrac.telangana.gov.in/arcgis/rest/services/Agri2/Agriculture2_CropAnalysis_Layers/MapServer/20
- TGRAC 1:50,000 project: https://tgrac.telangana.gov.in/trac/project-agriculture.php
- TGRAC National Soil Mapping: https://tgrac.telangana.gov.in/trac/agriculture-project.php
- BHOOMI: https://bhoomigeoportal-nbsslup.in/BHOOMI_StateWise/
- NRSC Indian Soil Datasets: https://www.nrsc.gov.in/nrscnew/Apps_Earth_terre_More.php?lang_code=en
