export const EvaluationReferenceIndex = [
  {
    code: "ECONOMIC_STABILITY",
    label: "Economic Stability",
    coreQuestion: "Can residents build secure financial lives?",
    indicators: [
      { code: "MEDIAN_INCOME_PPP", label: "Median income (PPP-adjusted)", unit: "currency_ppp" },
      { code: "EMPLOYMENT_RATE", label: "Employment rate / job market depth", unit: "percentage" },
      { code: "INCOME_INEQUALITY_GINI", label: "Income inequality (Gini coefficient)", unit: "index_0_1" },
      { code: "COST_OF_LIVING_RATIO", label: "Cost of living vs income ratio", unit: "ratio" },
      { code: "HOUSING_AFFORDABILITY", label: "Housing affordability index", unit: "index_0_100" },
    ],
  },

  {
    code: "HEALTHCARE_PUBLIC_HEALTH",
    label: "Healthcare & Public Health",
    coreQuestion: "Can people live long, healthy lives?",
    indicators: [
      { code: "LIFE_EXPECTANCY", label: "Life expectancy", unit: "years" },
      { code: "INFANT_MORTALITY", label: "Infant mortality rate", unit: "per_1000_births" },
      { code: "HEALTHCARE_ACCESS", label: "Access to primary & emergency care", unit: "index_0_100" },
      { code: "HEALTHCARE_AFFORDABILITY", label: "Healthcare affordability", unit: "index_0_100" },
      { code: "MENTAL_HEALTH_SUPPORT", label: "Mental health support availability", unit: "index_0_100" },
      { code: "AIR_QUALITY_INDEX", label: "Air quality index (AQI)", unit: "aqi" },
    ],
  },

  {
    code: "SAFETY_RULE_OF_LAW",
    label: "Safety & Rule of Law",
    coreQuestion: "Do people feel physically secure?",
    indicators: [
      { code: "VIOLENT_CRIME_RATE", label: "Violent crime rate", unit: "per_100k" },
      { code: "PROPERTY_CRIME_RATE", label: "Property crime rate", unit: "per_100k" },
      { code: "POLICE_TRUST", label: "Police trust levels", unit: "index_0_100" },
      { code: "JUDICIAL_EFFICIENCY", label: "Judicial efficiency", unit: "index_0_100" },
      { code: "CORRUPTION_PERCEPTION", label: "Corruption perception index", unit: "index_0_100" },
    ],
  },

  {
    code: "EDUCATION_HUMAN_CAPITAL",
    label: "Education & Human Capital",
    coreQuestion: "Does the place enable upward mobility?",
    indicators: [
      { code: "LITERACY_RATE", label: "Literacy rate", unit: "percentage" },
      { code: "SCHOOL_QUALITY", label: "School quality", unit: "index_0_100" },
      { code: "HIGHER_ED_ACCESS", label: "Higher education access", unit: "index_0_100" },
      { code: "SKILL_INFRASTRUCTURE", label: "Skill development infrastructure", unit: "index_0_100" },
      { code: "RESEARCH_INNOVATION", label: "Research & innovation ecosystem", unit: "index_0_100" },
    ],
  },

  {
    code: "INFRASTRUCTURE_URBAN_DESIGN",
    label: "Infrastructure & Urban Design",
    coreQuestion: "Is daily life efficient and frictionless?",
    indicators: [
      { code: "PUBLIC_TRANSPORT", label: "Public transport coverage", unit: "percentage" },
      { code: "ROAD_CONGESTION", label: "Road quality & congestion index", unit: "index_0_100" },
      { code: "WALKABILITY", label: "Walkability score", unit: "index_0_100" },
      { code: "INTERNET_RELIABILITY", label: "Internet speed & reliability", unit: "mbps_or_index" },
      { code: "UTILITIES_STABILITY", label: "Utilities stability (water, electricity)", unit: "index_0_100" },
    ],
  },

  {
    code: "ENVIRONMENTAL_QUALITY",
    label: "Environmental Quality",
    coreQuestion: "Is the ecosystem sustainable and healthy?",
    indicators: [
      { code: "AIR_WATER_QUALITY", label: "Air and water quality", unit: "index_0_100" },
      { code: "GREEN_SPACE", label: "Green space per capita", unit: "sqm_per_person" },
      { code: "CLIMATE_RISK", label: "Climate risk exposure", unit: "risk_index" },
      { code: "WASTE_MANAGEMENT", label: "Waste management efficiency", unit: "index_0_100" },
      { code: "NOISE_POLLUTION", label: "Noise pollution levels", unit: "decibel_avg" },
    ],
  },

  {
    code: "SOCIAL_COHESION_COMMUNITY",
    label: "Social Cohesion & Community",
    coreQuestion: "Do people feel connected and supported?",
    indicators: [
      { code: "SOCIAL_TRUST", label: "Social trust index", unit: "index_0_100" },
      { code: "VOLUNTEERISM", label: "Volunteerism rates", unit: "percentage" },
      { code: "FAMILY_STABILITY", label: "Family stability metrics", unit: "index_0_100" },
      { code: "COMMUNITY_ENGAGEMENT", label: "Community engagement", unit: "index_0_100" },
      { code: "CULTURAL_VIBRANCY", label: "Cultural vibrancy", unit: "index_0_100" },
    ],
  },

  {
    code: "GOVERNANCE_POLITICAL_STABILITY",
    label: "Governance & Political Stability",
    coreQuestion: "Is the system stable and predictable?",
    indicators: [
      { code: "POLITICAL_STABILITY", label: "Political stability index", unit: "index_0_100" },
      { code: "REGULATORY_TRANSPARENCY", label: "Regulatory transparency", unit: "index_0_100" },
      { code: "EASE_OF_DOING_BUSINESS", label: "Ease of doing business", unit: "rank_or_index" },
      { code: "CIVIL_LIBERTIES", label: "Civil liberties score", unit: "index_0_100" },
      { code: "PRESS_FREEDOM", label: "Press freedom index", unit: "index_0_100" },
    ],
  },

  {
    code: "WORK_LIFE_BALANCE",
    label: "Work-Life Balance",
    coreQuestion: "Can people enjoy life outside work?",
    indicators: [
      { code: "AVERAGE_WORK_HOURS", label: "Average working hours", unit: "hours_per_week" },
      { code: "PAID_LEAVE", label: "Paid leave policy", unit: "days_per_year" },
      { code: "COMMUTE_TIME", label: "Commute times", unit: "minutes_avg" },
      { code: "WORK_CULTURE", label: "Work culture norms", unit: "index_0_100" },
      { code: "LEISURE_INFRASTRUCTURE", label: "Leisure infrastructure", unit: "index_0_100" },
    ],
  },

  {
    code: "SUBJECTIVE_WELLBEING",
    label: "Subjective Wellbeing",
    coreQuestion: "How do people actually feel?",
    indicators: [
      { code: "LIFE_SATISFACTION", label: "Self-reported life satisfaction", unit: "scale_0_10" },
      { code: "AFFECT_BALANCE", label: "Positive/negative affect ratio", unit: "ratio" },
      { code: "FUTURE_OPTIMISM", label: "Future optimism", unit: "index_0_100" },
      { code: "TRUST_IN_OTHERS", label: "Trust in others", unit: "index_0_100" },
    ],
  },
];