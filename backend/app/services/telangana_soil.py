DISTRICTS = [
    ("adilabad", "Adilabad"),
    ("bhadradri-kothagudem", "Bhadradri Kothagudem"),
    ("hanumakonda", "Hanumakonda"),
    ("hyderabad", "Hyderabad"),
    ("jagtial", "Jagtial"),
    ("jangoan", "Jangaon"),
    ("jayashankar-bhupalpally", "Jayashankar Bhupalpally"),
    ("jogulamba-gadwal", "Jogulamba Gadwal"),
    ("kamareddy", "Kamareddy"),
    ("karimnagar", "Karimnagar"),
    ("khammam", "Khammam"),
    ("kumuram-bheem-asifabad", "Kumuram Bheem Asifabad"),
    ("mahabubabad", "Mahabubabad"),
    ("mahabubnagar", "Mahabubnagar"),
    ("mancherial", "Mancherial"),
    ("medak", "Medak"),
    ("medchal-malkajgiri", "Medchal-Malkajgiri"),
    ("mulugu", "Mulugu"),
    ("nagarkurnool", "Nagarkurnool"),
    ("nalgonda", "Nalgonda"),
    ("narayanpet", "Narayanpet"),
    ("nirmal", "Nirmal"),
    ("nizamabad", "Nizamabad"),
    ("peddapalli", "Peddapalli"),
    ("rajanna-sircilla", "Rajanna Sircilla"),
    ("rangareddy", "Rangareddy"),
    ("sangareddy", "Sangareddy"),
    ("siddipet", "Siddipet"),
    ("suryapet", "Suryapet"),
    ("vikarabad", "Vikarabad"),
    ("wanaparthy", "Wanaparthy"),
    ("warangal", "Warangal"),
    ("yadadri-bhuvanagiri", "Yadadri Bhuvanagiri"),
]
    
SOIL_SURVEY_PROJECTS = [
    {
        "id": "tgrac-soil-50000",
        "title": "Soil Resource Mapping and Soil Database",
        "scale": "1:50,000",
        "base_year": "2011-12",
        "historical_districts": [
            "Karimnagar",
            "Medak",
            "Warangal",
            "Khammam",
            "Nalgonda",
        ],
        "source_organisation": "Telangana Remote Sensing Applications Centre (TGRAC)",
        "source_url": "https://tgrac.telangana.gov.in/trac/project-agriculture.php",
        "data_type": "Historical soil resource mapping",
        "verification_status": "official_project_documented",
        "boundary_alignment": "requires_spatial_crosswalk",
    },
    {
        "id": "tgrac-national-soil-mapping-10000",
        "title": "National Soil Mapping Programme",
        "scale": "1:10,000",
        "base_year": None,
        "historical_districts": [
            "Warangal Rural",
            "Warangal Urban",
            "Jangaon",
            "Mahabubabad",
            "Siddipet",
            "Yadadri Bhuvanagiri",
        ],
        "source_organisation": "TGRAC / Soil and Land Use Survey of India",
        "source_url": "https://tgrac.telangana.gov.in/trac/agriculture-project.php",
        "data_type": "Historical soil mapping with profile studies and sample analysis",
        "verification_status": "official_project_documented",
        "boundary_alignment": "requires_spatial_crosswalk",
    },
]


def get_soil_survey_projects():
    """Return officially documented historical soil-survey projects."""
    return SOIL_SURVEY_PROJECTS


def get_districts():
    """Return the registered Telangana districts and their profile status."""
    return [
        {
            "id": slug,
            "name": name,
            "profile_status": "pending_verification",
            "soil_types": [],
            "data_available": False,
        }
        for slug, name in DISTRICTS
    ]


def get_district(slug: str):
    """Return one district profile using its unique slug."""
    return next(
        (
            district
            for district in get_districts()
            if district["id"] == slug
        ),
        None,
    )