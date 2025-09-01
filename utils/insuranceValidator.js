/**
 * Insurance Company Validation Utility
 * Handles Slovak insurance company name recognition and validation
 */

// Comprehensive mapping of Slovak insurance companies with all possible variations
const insuranceCompanies = {
  'VšZP': {
    official: 'VšZP',
    variations: [
      'všzp', 'vszp', 'všeobecná zdravotná poisťovňa', 'vseobecna zdravotna poistovna',
      'všeobecná', 'vseobecna', 'všeobecka', 'vseobecka', 'všeobecná poisťovňa',
      'vseobecna poistovna', 'verejná', 'verejna', 'štátna', 'statna',
      // Common ASR misrecognitions
      'vašzépé', 'vašezépé', 'všzépé', 'vešzépé', 'všzP', 'všeZP', 'všZP', 'vZP', 'všP', 'všeP', 'všezp'
    ]
  },
  'Dôvera': {
    official: 'Dôvera',
    variations: [
      'dovera', 'dôvera', 'doviera', 'dôviera', 'doviera zdravotná poisťovňa',
      'dovera zdravotna poistovna', 'dôvera zdravotná poisťovňa', 
      'dôvera zdravotná', 'dovera zdravotna', 'do overa', 'doovera', 'do vera',
      // Common ASR misrecognitions
      'dvojra', 'dvojera', 'dójera', 'dóvera', 'dvojera', 'dvojra', 'dvojira', 
      'douera', 'dováera', 'dvera', 'dojera', 'döera', 'dovara'
    ]
  },
  'Union': {
    official: 'Union',
    variations: [
      'union', 'únia', 'unia', 'union zdravotná poisťovňa', 
      'union zdravotna poistovna', 'únia zdravotná poisťovňa',
      'unia zdravotna poistovna', 'junion', 'unión',
      // Common ASR misrecognitions
      'únion', 'julion', 'yulion', 'únión', 'yunion', 'julon', 'uwion'
    ]
  }

};

/**
 * Validates and normalizes insurance company name
 * @param {string} inputInsurance - User input insurance name
 * @returns {object} - { isValid: boolean, normalized: string|null, suggestions: string[] }
 */
function validateAndNormalizeInsurance(inputInsurance) {
  if (!inputInsurance || typeof inputInsurance !== 'string') {
    return {
      isValid: false,
      normalized: null,
      suggestions: Object.keys(insuranceCompanies),
      error: 'Potrebujem názov poisťovne'
    };
  }

  // Clean and normalize input
  const cleanInput = inputInsurance.toLowerCase()
    .trim()
    .replace(/[.,!?]/g, '') // Remove punctuation
    .replace(/\s+/g, ' '); // Normalize spaces

  // Check for exact matches first
  for (const [officialName, data] of Object.entries(insuranceCompanies)) {
    // Check official name (case insensitive)
    if (cleanInput === officialName.toLowerCase()) {
      return {
        isValid: true,
        normalized: data.official,
        suggestions: []
      };
    }

    // Check all variations
    for (const variation of data.variations) {
      if (cleanInput === variation.toLowerCase() || 
          cleanInput.includes(variation.toLowerCase()) ||
          variation.toLowerCase().includes(cleanInput)) {
        return {
          isValid: true,
          normalized: data.official,
          suggestions: []
        };
      }
    }
  }

  // Fuzzy matching for partial matches
  const suggestions = [];
  for (const [officialName, data] of Object.entries(insuranceCompanies)) {
    // Check if any part of input matches part of variations
    for (const variation of data.variations) {
      if (variation.toLowerCase().includes(cleanInput) || 
          cleanInput.includes(variation.toLowerCase())) {
        if (!suggestions.includes(data.official)) {
          suggestions.push(data.official);
        }
      }
    }
  }

  return {
    isValid: false,
    normalized: null,
    suggestions: suggestions.length > 0 ? suggestions : Object.keys(insuranceCompanies),
    error: suggestions.length > 0 ? 
      `Mysleli ste: ${suggestions.join(', ')}?` : 
      `Nepoznám poisťovňu "${inputInsurance}". Dostupné poisťovne: ${Object.keys(insuranceCompanies).join(', ')}`
  };
}

/**
 * Get all supported insurance companies
 * @returns {string[]} - Array of official insurance company names
 */
function getSupportedInsuranceCompanies() {
  return Object.keys(insuranceCompanies);
}

/**
 * Get insurance company variations for voice recognition hints
 * @returns {object} - Mapping of official names to all variations
 */
function getInsuranceVariations() {
  const variations = {};
  for (const [officialName, data] of Object.entries(insuranceCompanies)) {
    variations[officialName] = [officialName.toLowerCase(), ...data.variations];
  }
  return variations;
}

module.exports = {
  validateAndNormalizeInsurance,
  getSupportedInsuranceCompanies,
  getInsuranceVariations,
  insuranceCompanies
};