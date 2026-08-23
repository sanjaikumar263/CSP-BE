const mongoose = require('mongoose');

const timelineItemSchema = new mongoose.Schema({
  year: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true }
});

const storeInfoSchema = new mongoose.Schema(
  {
    // Contact & Address Details
    phone: {
      type: String,
      default: '03 33727272',
      trim: true
    },
    altPhone: {
      type: String,
      default: '+60 3 3372 7272',
      trim: true
    },
    email: {
      type: String,
      default: 'info@chennaisilkpalace.com',
      trim: true
    },
    supportEmail: {
      type: String,
      default: 'support@chennaisilkpalace.com',
      trim: true
    },
    address: {
      type: String,
      default: 'No. 1, Jalan Sultan Iskandar, 30000 Ipoh, Perak, Malaysia.',
      trim: true
    },
    businessHours: {
      type: String,
      default: 'Daily: 10:00 AM - 9:30 PM',
      trim: true
    },
    whatsapp: {
      type: String,
      default: '+60123456789',
      trim: true
    },
    facebook: {
      type: String,
      default: '#facebook',
      trim: true
    },
    instagram: {
      type: String,
      default: '#instagram',
      trim: true
    },
    youtube: {
      type: String,
      default: '#youtube',
      trim: true
    },

    // About Us Content
    heroSubtitleTag: {
      type: String,
      default: 'ABOUT CHENNAI SILK PALACE',
      trim: true
    },
    heroTitle: {
      type: String,
      default: 'A Legacy of Trust, Tradition & Excellence',
      trim: true
    },
    heroSubtitle: {
      type: String,
      default: 'Crafting elegance and preserving timeless Indian textile traditions for over four decades in Malaysia.',
      trim: true
    },
    directorName: {
      type: String,
      default: 'Mr. Thanasekaran Vellaikkoothan',
      trim: true
    },
    directorRole: {
      type: String,
      default: 'Director, Chennai Silk Palace Sdn. Bhd.',
      trim: true
    },
    directorQuote: {
      type: String,
      default: 'Behind every great brand is a visionary whose passion transforms dreams into reality. For over four decades, Mr. Thanasekaran Vellaikkoothan has been a respected pioneer in Malaysia’s textile industry, building Chennai Silk Palace into one of the country’s most trusted and admired destinations for authentic Indian textiles and traditional attire.',
      trim: true
    },
    directorBody: {
      type: String,
      default: 'Driven by a commitment to quality, integrity, authenticity, and exceptional customer service, he has earned the confidence of generations of customers. Today, Chennai Silk Palace is more than a textile retailer — it is a household name synonymous with elegance, heritage, and timeless craftsmanship.',
      trim: true
    },
    directorYears: {
      type: String,
      default: '40+',
      trim: true
    },
    directorImage: {
      type: String,
      default: '',
      trim: true
    },
    footerAboutText: {
      type: String,
      default: 'Your ultimate destination for exquisite silk sarees and traditional Indian wear. Experience timeless elegance, handcrafted with passion.',
      trim: true
    },
    visionText: {
      type: String,
      default: 'To preserve the timeless beauty of Indian textiles while continuously delivering quality, authenticity, innovation, and exceptional customer experiences for generations to come.',
      trim: true
    },
    missionText: {
      type: String,
      default: 'To be Malaysia’s most trusted destination for premium Indian textiles by offering authentic products, outstanding value, personalised service, and an unforgettable shopping experience, while preserving cultural heritage and making a meaningful contribution to the community.',
      trim: true
    },

    // Entrepreneur Journey Timeline Milestones
    timeline: {
      type: [timelineItemSchema],
      default: [
        {
          year: '1985',
          title: 'The Early Vision',
          description: 'Mr. Thanasekaran’s entrepreneurial journey began in 1985 with a clear vision to bring the finest Indian textiles to customers in Malaysia. Travelling extensively between India and Malaysia, he personally sourced premium fabrics from renowned textile manufacturers and established long-lasting relationships built on trust and quality.'
        },
        {
          year: '1992',
          title: 'Wholesale Operations Established',
          description: 'In 1992, he officially established his wholesale textile company in Malaysia under his late father’s name. By importing textile products directly from India in large container shipments, he created an efficient and reliable supply network that served retailers nationwide while strengthening Malaysia’s textile industry.'
        },
        {
          year: '2004 - 2006',
          title: 'Creating an Iconic Landmark',
          description: 'A defining milestone came in 2004, when Mr. Thanasekaran acquired the historic Standard Chartered Bank building in Klang. Recognising its heritage value, he carefully restored the landmark while preserving its architectural charm. In 2006, it reopened as the flagship showroom of Chennai Silk Palace.'
        },
        {
          year: '2012',
          title: 'Ipoh Branch Expansion',
          description: 'The opening of the Ipoh showroom brought Chennai Silk Palace’s signature quality and exceptional service closer to customers in Perak and the northern region.'
        },
        {
          year: '2013',
          title: 'Penang Branch Expansion',
          description: 'The Penang showroom further strengthened the brand’s nationwide presence, making premium Indian textiles more accessible while continuing the company’s tradition of excellence.'
        }
      ]
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('StoreInfo', storeInfoSchema);
