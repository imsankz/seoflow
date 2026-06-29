/**
 * SEO schema markup generation and validation for SEOFlow
 *
 * Generates and validates Schema.org structured data in JSON-LD format.
 * Supports multiple schema types including Article, FAQPage, Product, LocalBusiness, etc.
 */

import type { Frontmatter } from './types';

export interface SchemaData {
  '@context': 'https://schema.org';
  '@type': string;
  [key: string]: any;
}

export type SchemaType = 'Article' | 'FAQPage' | 'Product' | 'LocalBusiness' | 'TravelGuide' | 'Review' | 'WebSite' | 'WebPage' | 'Organization' | 'BlogPosting' | 'NewsArticle' | 'Service' | 'Event' | 'JobPosting' | 'Course' | 'DiscussionForumPosting';

/**
 * Detects schema type from frontmatter or content
 */
export function detectSchemaType(fm: Frontmatter, content: string): SchemaType {
  // Check frontmatter first
  if (fm.schema) {
    const schema = fm.schema.toLowerCase();
    if (schema.includes('faq')) return 'FAQPage';
    if (schema.includes('product')) return 'Product';
    if (schema.includes('local')) return 'LocalBusiness';
    if (schema.includes('travel') || schema.includes('guide')) return 'TravelGuide';
    if (schema.includes('review')) return 'Review';
    if (schema.includes('blog')) return 'BlogPosting';
    if (schema.includes('news')) return 'NewsArticle';
    if (schema.includes('service')) return 'Service';
    if (schema.includes('event')) return 'Event';
    if (schema.includes('job')) return 'JobPosting';
    if (schema.includes('course')) return 'Course';
    if (schema.includes('forum')) return 'DiscussionForumPosting';
    if (schema.includes('organization')) return 'Organization';
    if (schema.includes('website')) return 'WebSite';
    if (schema.includes('webpage')) return 'WebPage';
    if (schema.includes('article')) return 'Article';
  }

  // Check content for patterns
  const title = (fm.title || '').toLowerCase();
  const tags = (fm.tags || []).join(' ').toLowerCase();
  const contentLower = content.toLowerCase();

  if (title.includes('review') || tags.includes('review') || contentLower.includes('review')) {
    return 'Review';
  }

  if (title.includes('faq') || title.includes('questions') || contentLower.includes('faq')) {
    return 'FAQPage';
  }

  if (title.includes('guide') || title.includes('things to do') || title.includes('tips')) {
    return 'TravelGuide';
  }

  if (title.includes('blog') || contentLower.includes('blog')) {
    return 'BlogPosting';
  }

  if (title.includes('news') || contentLower.includes('breaking') || contentLower.includes('news')) {
    return 'NewsArticle';
  }

  return 'Article'; // Default
}

/**
 * Generates Article schema
 */
export function generateArticleSchema(fm: Frontmatter): SchemaData {
  const schema: SchemaData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: fm.title || '',
    description: fm.description || '',
    author: {
      '@type': 'Person',
      name: fm.author || 'Unknown',
    },
    datePublished: fm.date || new Date().toISOString().split('T')[0],
    dateModified: fm.lastModified || fm.date || new Date().toISOString().split('T')[0],
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': fm.slug || '',
    },
  };

  if (fm.category) {
    schema.articleSection = fm.category;
  }

  if (fm.tags && fm.tags.length > 0) {
    schema.keywords = fm.tags.join(', ');
  }

  return schema;
}

/**
 * Generates FAQPage schema
 */
export function generateFAQSchema(fm: Frontmatter, content: string): SchemaData {
  const faqSections = extractFAQSections(content);

  const schema: SchemaData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqSections.map(section => ({
      '@type': 'Question',
      name: section.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: section.answer,
      },
    })),
  };

  return schema;
}

/**
 * Generates Product schema
 */
export function generateProductSchema(fm: Frontmatter): SchemaData {
  const schema: SchemaData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: fm.title || '',
    description: fm.description || '',
  };

  if (fm.price) {
    schema.offers = {
      '@type': 'Offer',
      price: fm.price,
      priceCurrency: 'USD', // Default
      availability: 'https://schema.org/InStock',
    };
  }

  if (fm.rating) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: fm.rating,
      reviewCount: fm.reviewCount || 0,
    };
  }

  return schema;
}

/**
 * Generates LocalBusiness schema
 */
export function generateLocalBusinessSchema(fm: Frontmatter): SchemaData {
  const schema: SchemaData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: fm.title || '',
    description: fm.description || '',
  };

  if (fm.address) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: fm.address.street || '',
      addressLocality: fm.address.city || '',
      addressRegion: fm.address.state || '',
      postalCode: fm.address.zip || '',
      addressCountry: fm.address.country || 'US',
    };
  }

  if (fm.phone) {
    schema.telephone = fm.phone;
  }

  if (fm.geo) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: fm.geo.latitude,
      longitude: fm.geo.longitude,
    };
  }

  return schema;
}

/**
 * Generates TravelGuide schema
 */
export function generateTravelGuideSchema(fm: Frontmatter): SchemaData {
  const schema: SchemaData = {
    '@context': 'https://schema.org',
    '@type': 'TravelGuide',
    name: fm.title || '',
    description: fm.description || '',
    destination: fm.category || fm.tags?.[0] || '',
  };

  return schema;
}

/**
 * Generates Review schema
 */
export function generateReviewSchema(fm: Frontmatter): SchemaData {
  const schema: SchemaData = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'Product',
      name: fm.title || '',
    },
    author: {
      '@type': 'Person',
      name: fm.author || 'Unknown',
    },
    datePublished: fm.date || new Date().toISOString().split('T')[0],
  };

  if (fm.rating) {
    schema.reviewRating = {
      '@type': 'Rating',
      ratingValue: fm.rating,
      bestRating: 5,
    };
  }

  return schema;
}

/**
 * Extracts FAQ sections from content
 */
function extractFAQSections(content: string): Array<{ question: string; answer: string }> {
  const faqs: Array<{ question: string; answer: string }> = [];
  const faqPattern = /###?\s*Q:?\s*(.*?)(?:\n|$)([\s\S]*?)(?=###?\s*Q:|$)/g;
  let match;

  while ((match = faqPattern.exec(content)) !== null) {
    const question = match[1].trim();
    const answer = match[2].trim();
    if (question && answer) {
      faqs.push({ question, answer });
    }
  }

  return faqs;
}

/**
 * Generates WebSite schema
 */
export function generateWebSiteSchema(fm: Frontmatter): SchemaData {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: fm.siteName || '',
    url: fm.siteUrl || '',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${fm.siteUrl || ''}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Generates WebPage schema
 */
export function generateWebPageSchema(fm: Frontmatter): SchemaData {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: fm.title || '',
    description: fm.description || '',
    url: fm.slug || '',
  };
}

/**
 * Generates Organization schema
 */
export function generateOrganizationSchema(fm: Frontmatter): SchemaData {
  const schema: SchemaData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: fm.organization || '',
    url: fm.siteUrl || '',
  };

  if (fm.logo) {
    schema.logo = fm.logo;
  }

  if (fm.contactEmail || fm.phone) {
    schema.contactPoint = {
      '@type': 'ContactPoint',
      telephone: fm.phone || '',
      email: fm.contactEmail || '',
      contactType: 'customer service',
    };
  }

  if (fm.socialLinks) {
    schema.sameAs = Object.values(fm.socialLinks);
  }

  return schema;
}

/**
 * Generates BlogPosting schema
 */
export function generateBlogPostingSchema(fm: Frontmatter): SchemaData {
  const schema: SchemaData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: fm.title || '',
    description: fm.description || '',
    author: {
      '@type': 'Person',
      name: fm.author || 'Unknown',
    },
    datePublished: fm.date || new Date().toISOString().split('T')[0],
    dateModified: fm.lastModified || fm.date || new Date().toISOString().split('T')[0],
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': fm.slug || '',
    },
  };

  if (fm.category) {
    schema.articleSection = fm.category;
  }

  if (fm.tags && fm.tags.length > 0) {
    schema.keywords = fm.tags.join(', ');
  }

  return schema;
}

/**
 * Generates NewsArticle schema
 */
export function generateNewsArticleSchema(fm: Frontmatter): SchemaData {
  const schema: SchemaData = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: fm.title || '',
    description: fm.description || '',
    author: {
      '@type': 'Person',
      name: fm.author || 'Unknown',
    },
    datePublished: fm.date || new Date().toISOString().split('T')[0],
    dateModified: fm.lastModified || fm.date || new Date().toISOString().split('T')[0],
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': fm.slug || '',
    },
    publisher: {
      '@type': 'Organization',
      name: fm.organization || '',
      logo: {
        '@type': 'ImageObject',
        url: fm.logo || '',
      },
    },
  };

  if (fm.category) {
    schema.articleSection = fm.category;
  }

  if (fm.tags && fm.tags.length > 0) {
    schema.keywords = fm.tags.join(', ');
  }

  return schema;
}

/**
 * Generates Service schema
 */
export function generateServiceSchema(fm: Frontmatter): SchemaData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: fm.title || '',
    description: fm.description || '',
    provider: {
      '@type': 'Organization',
      name: fm.organization || '',
    },
  };
}

/**
 * Generates Event schema
 */
export function generateEventSchema(fm: Frontmatter): SchemaData {
  const schema: SchemaData = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: fm.title || '',
    description: fm.description || '',
    startDate: fm.startDate || '',
    endDate: fm.endDate || '',
  };

  if (fm.location) {
    schema.location = {
      '@type': 'Place',
      name: fm.location.name || '',
      address: {
        '@type': 'PostalAddress',
        streetAddress: fm.location.street || '',
        addressLocality: fm.location.city || '',
        addressRegion: fm.location.state || '',
        postalCode: fm.location.zip || '',
        addressCountry: fm.location.country || 'US',
      },
    };
  }

  return schema;
}

/**
 * Generates JobPosting schema
 */
export function generateJobPostingSchema(fm: Frontmatter): SchemaData {
  const schema: SchemaData = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: fm.title || '',
    description: fm.description || '',
    datePosted: fm.date || new Date().toISOString().split('T')[0],
    employmentType: fm.employmentType || 'FULL_TIME',
  };

  if (fm.location) {
    schema.jobLocation = {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        streetAddress: fm.location.street || '',
        addressLocality: fm.location.city || '',
        addressRegion: fm.location.state || '',
        postalCode: fm.location.zip || '',
        addressCountry: fm.location.country || 'US',
      },
    };
  }

  if (fm.salary) {
    schema.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: fm.salary.currency || 'USD',
      value: {
        '@type': 'QuantitativeValue',
        minValue: fm.salary.min || 0,
        maxValue: fm.salary.max || 0,
        unitText: 'YEAR',
      },
    };
  }

  return schema;
}

/**
 * Generates Course schema
 */
export function generateCourseSchema(fm: Frontmatter): SchemaData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: fm.title || '',
    description: fm.description || '',
    provider: {
      '@type': 'Organization',
      name: fm.organization || '',
    },
  };
}

/**
 * Generates DiscussionForumPosting schema
 */
export function generateDiscussionForumPostingSchema(fm: Frontmatter): SchemaData {
  return {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    headline: fm.title || '',
    description: fm.description || '',
    author: {
      '@type': 'Person',
      name: fm.author || 'Unknown',
    },
    datePublished: fm.date || new Date().toISOString().split('T')[0],
    dateModified: fm.lastModified || fm.date || new Date().toISOString().split('T')[0],
  };
}

/**
 * Generates appropriate schema based on frontmatter and content
 */
export function generateSchema(fm: Frontmatter, content: string): SchemaData {
  const type = detectSchemaType(fm, content);

  switch (type) {
    case 'FAQPage':
      return generateFAQSchema(fm, content);
    case 'Product':
      return generateProductSchema(fm);
    case 'LocalBusiness':
      return generateLocalBusinessSchema(fm);
    case 'TravelGuide':
      return generateTravelGuideSchema(fm);
    case 'Review':
      return generateReviewSchema(fm);
    case 'BlogPosting':
      return generateBlogPostingSchema(fm);
    case 'NewsArticle':
      return generateNewsArticleSchema(fm);
    case 'Service':
      return generateServiceSchema(fm);
    case 'Event':
      return generateEventSchema(fm);
    case 'JobPosting':
      return generateJobPostingSchema(fm);
    case 'Course':
      return generateCourseSchema(fm);
    case 'DiscussionForumPosting':
      return generateDiscussionForumPostingSchema(fm);
    case 'Organization':
      return generateOrganizationSchema(fm);
    case 'WebSite':
      return generateWebSiteSchema(fm);
    case 'WebPage':
      return generateWebPageSchema(fm);
    case 'Article':
    default:
      return generateArticleSchema(fm);
  }
}

/**
 * Validates schema against Schema.org constraints (Claude SEO rules)
 */
export function validateSchema(schema: SchemaData): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required properties
  if (!schema['@context'] || schema['@context'] !== 'https://schema.org') {
    errors.push('Missing or invalid @context');
  }

  if (!schema['@type']) {
    errors.push('Missing @type');
  }

  // Check for deprecated schema types
  const deprecatedTypes = ['HowTo', 'SpecialAnnouncement', 'CourseInfo', 'EstimatedSalary', 'LearningVideo', 'ClaimReview', 'VehicleListing', 'PracticeProblem', 'Dataset'];
  if (deprecatedTypes.includes(schema['@type'])) {
    errors.push(`${schema['@type']} is a deprecated schema type and should not be used`);
  }

  // FAQPage - no longer eligible for rich results (May 2026)
  if (schema['@type'] === 'FAQPage') {
    warnings.push('FAQPage no longer appears as a rich result (Google May 2026 update), but still aids AI entity resolution');
  }

  // Type-specific validation
  switch (schema['@type']) {
    case 'Article':
    case 'BlogPosting':
    case 'NewsArticle':
      if (!schema.headline || schema.headline.length < 5) {
        errors.push(`${schema['@type']} must have a valid headline`);
      }
      if (!schema.description || schema.description.length < 20) {
        errors.push(`${schema['@type']} must have a valid description`);
      }
      if (!schema.author) {
        errors.push(`${schema['@type']} must have an author`);
      }
      if (!schema.datePublished) {
        errors.push(`${schema['@type']} must have a publication date`);
      }
      break;
    case 'FAQPage':
      if (!schema.mainEntity || !Array.isArray(schema.mainEntity) || schema.mainEntity.length === 0) {
        errors.push('FAQPage must have at least one question');
      } else {
        schema.mainEntity.forEach((faq: any, idx: number) => {
          if (!faq['@type'] || faq['@type'] !== 'Question') {
            errors.push(`FAQ ${idx + 1}: Must be a Question type`);
          }
          if (!faq.name || faq.name.length < 5) {
            errors.push(`FAQ ${idx + 1}: Question must be at least 5 characters`);
          }
          if (!faq.acceptedAnswer || !faq.acceptedAnswer.text) {
            errors.push(`FAQ ${idx + 1}: Must have an accepted answer`);
          }
        });
      }
      break;
    case 'Product':
      if (!schema.name || schema.name.length < 2) {
        errors.push('Product must have a name');
      }
      if (!schema.description || schema.description.length < 20) {
        errors.push('Product must have a valid description');
      }
      // Check for required product properties for merchant listings
      if (schema.offers) {
        if (!schema.offers.price) {
          warnings.push('Product should have an offers.price for merchant listings');
        }
        if (!schema.offers.priceCurrency) {
          warnings.push('Product should have an offers.priceCurrency for merchant listings');
        }
      }
      break;
    case 'Review':
      if (!schema.itemReviewed) {
        errors.push('Review must have an itemReviewed');
      }
      if (!schema.author) {
        errors.push('Review must have an author');
      }
      if (!schema.datePublished) {
        errors.push('Review must have a publication date');
      }
      if (!schema.reviewRating || !schema.reviewRating.ratingValue) {
        errors.push('Review must have a reviewRating with ratingValue');
      }
      break;
    case 'LocalBusiness':
      if (!schema.name || schema.name.length < 2) {
        errors.push('LocalBusiness must have a name');
      }
      if (!schema.description || schema.description.length < 20) {
        errors.push('LocalBusiness must have a valid description');
      }
      if (!schema.address) {
        warnings.push('LocalBusiness should have an address');
      }
      if (!schema.telephone) {
        warnings.push('LocalBusiness should have a telephone');
      }
      break;
    case 'WebSite':
      if (!schema.name || schema.name.length < 2) {
        errors.push('WebSite must have a name');
      }
      if (!schema.url || !schema.url.startsWith('http')) {
        errors.push('WebSite must have a valid URL');
      }
      break;
    case 'WebPage':
      if (!schema.name || schema.name.length < 2) {
        errors.push('WebPage must have a name');
      }
      if (!schema.url || !schema.url.startsWith('http')) {
        errors.push('WebPage must have a valid URL');
      }
      break;
  }

  // Check for common errors
  Object.entries(schema).forEach(([key, value]) => {
    // Check for placeholder text
    if (typeof value === 'string' && value.includes('[')) {
      warnings.push(`Property ${key} contains placeholder text`);
    }
    // Check for relative URLs
    if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
      warnings.push(`Property ${key} should use absolute URL instead of relative path`);
    }
    // Check date format
    if (key.includes('date') && typeof value === 'string') {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(value) && key !== 'description') {
        warnings.push(`Property ${key} should be in ISO 8601 format (YYYY-MM-DD)`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Formats schema as JSON-LD script tag
 */
export function formatSchema(schema: SchemaData): string {
  return `<script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
</script>`;
}

/**
 * Extracts existing schema from content
 */
export function extractSchema(content: string): SchemaData | null {
  const schemaPattern = /<script type="application\/ld\+json">(.*?)<\/script>/s;
  const match = content.match(schemaPattern);

  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Main schema workflow: generate, validate, and update content
 */
export function processSchema(fm: Frontmatter, content: string): {
  schema: SchemaData;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  updatedContent: string;
} {
  // Extract existing schema if present
  const existingSchema = extractSchema(content);

  // Generate new schema
  const schema = existingSchema || generateSchema(fm, content);

  // Validate schema
  const validation = validateSchema(schema);

  // Update content with schema
  let updatedContent = content;
  const schemaTag = formatSchema(schema);

  if (existingSchema) {
    // Replace existing schema
    updatedContent = content.replace(/<script type="application\/ld\+json">.*?<\/script>/s, schemaTag);
  } else {
    // Add new schema after opening <head> or at beginning of content
    if (content.includes('<head>')) {
      updatedContent = content.replace('<head>', `<head>\n${schemaTag}`);
    } else {
      updatedContent = schemaTag + '\n' + content;
    }
  }

  return {
    schema,
    isValid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
    updatedContent,
  };
}
