import { db, Topic } from './database'

// The 31 core tax topics extracted from NotebookLM analysis
const TAX_TOPICS_SEED: Omit<Topic, 'id' | 'created_at' | 'updated_at'>[] = [
  // Compliance & Reporting (High Priority)
  {
    title_english: "FBAR Filing Requirements for Israeli-Americans",
    title_hebrew: "דרישות הגשת FBAR לישראלים-אמריקאים",
    priority: 'high',
    seasonal_relevance: "Jan-Apr peak, Oct extension deadline",
    tags: ["FBAR", "FinCEN 114", "foreign accounts", "compliance", "dual citizenship"]
  },
  {
    title_english: "FATCA Compliance Guide for Cross-Border Tax Planning",
    title_hebrew: "מדריך ציות ל-FATCA לתכנון מס חוצה גבולות",
    priority: 'high', 
    seasonal_relevance: "Year-round critical",
    tags: ["FATCA", "foreign assets", "reporting", "IRS", "compliance"]
  },
  {
    title_english: "PFIC Reporting: Passive Foreign Investment Company Rules",
    title_hebrew: "דיווח PFIC: כללים לחברת השקעות זרה פסיבית",
    priority: 'medium',
    seasonal_relevance: "Apr filing deadline",
    tags: ["PFIC", "Form 8621", "foreign investments", "mutual funds"]
  },
  {
    title_english: "CFC Rules: Controlled Foreign Corporation Compliance",
    title_hebrew: "כללי CFC: ציות לחברה זרה מבוקרת",
    priority: 'medium',
    seasonal_relevance: "Year-round",
    tags: ["CFC", "controlled foreign corporation", "Subpart F", "GILTI"]
  },
  {
    title_english: "Streamlined Filing Procedures for Non-Compliant Taxpayers",
    title_hebrew: "נהלי הגשה מפושטים למשלמי מס לא ציותיים",
    priority: 'high',
    seasonal_relevance: "Year-round amnesty",
    tags: ["streamlined procedure", "amnesty", "non-compliance", "penalty relief"]
  },

  // Tax Forms & Residency (High Priority)
  {
    title_english: "Complete Guide to Form 1040 for US Citizens Living in Israel",
    title_hebrew: "מדריך מלא לטופס 1040 לאזרחי ארה\"ב המתגוררים בישראל",
    priority: 'high',
    seasonal_relevance: "Jan-Apr peak",
    tags: ["Form 1040", "US citizens abroad", "foreign earned income", "tax residency"]
  },
  {
    title_english: "Form 1040-NR Guide for Israeli Non-Resident Investors",
    title_hebrew: "מדריך טופס 1040-NR למשקיעים ישראלים לא תושבים",
    priority: 'high',
    seasonal_relevance: "Apr filing deadline",
    tags: ["Form 1040-NR", "non-resident", "US investments", "withholding tax"]
  },
  {
    title_english: "State Tax Obligations for Israeli-Americans: Which States to Avoid",
    title_hebrew: "חובות מס מדינתי לישראלים-אמריקאים: אילו מדינות להימנע מהן",
    priority: 'medium',
    seasonal_relevance: "Apr-May state deadlines",
    tags: ["state tax", "residency", "nexus", "domicile", "tax-friendly states"]
  },

  // Treaties & Agreements (High Priority)
  {
    title_english: "US-Israel Tax Treaty: Complete Guide to Double Taxation Relief",
    title_hebrew: "אמנת המס ארה\"ב-ישראל: מדריך מלא לפטור ממיסוי כפול",
    priority: 'high',
    seasonal_relevance: "Year-round strategic",
    tags: ["tax treaty", "double taxation", "foreign tax credit", "tie-breaker rules"]
  },
  {
    title_english: "Social Security Totalization Agreement: Israel-US Benefits Coordination",
    title_hebrew: "הסכם טוטליזציה לביטוח לאומי: תיאום הטבות ישראל-ארה\"ב",
    priority: 'high',
    seasonal_relevance: "Retirement planning focus",
    tags: ["social security", "totalization", "retirement benefits", "self-employment tax"]
  },
  {
    title_english: "Self-Employment Tax Treaty Issues for Israeli-American Freelancers",
    title_hebrew: "בעיות מס עצמאים באמנה לפרילנסרים ישראלים-אמריקאים",
    priority: 'medium',
    seasonal_relevance: "Quarterly payments",
    tags: ["self-employment tax", "SE tax treaty", "freelancers", "independent contractors"]
  },

  // Investments & Assets (High Priority)
  {
    title_english: "Capital Gains Tax Planning for Cross-Border Property Sales",
    title_hebrew: "תכנון מס רווחי הון למכירת נכסים חוצי גבולות",
    priority: 'high',
    seasonal_relevance: "Dec year-end planning",
    tags: ["capital gains", "real estate", "Section 121", "primary residence"]
  },
  {
    title_english: "Israeli Real Estate Investments: US Tax Reporting Requirements",
    title_hebrew: "השקעות בנדל\"ן ישראלי: דרישות דיווח מס אמריקאי",
    priority: 'high',
    seasonal_relevance: "Year-round",
    tags: ["Israeli real estate", "foreign property", "rental income", "currency conversion"]
  },
  {
    title_english: "US Real Estate Owned by Israeli Investors: Tax Planning Strategies",
    title_hebrew: "נדל\"ן אמריקאי בבעלות משקיעים ישראלים: אסטרטגיות תכנון מס",
    priority: 'high',
    seasonal_relevance: "Year-round",
    tags: ["US real estate", "FIRPTA", "non-resident investors", "depreciation"]
  },
  {
    title_english: "Cryptocurrency Tax Reporting for Israeli-American Digital Asset Investors",
    title_hebrew: "דיווח מס מטבעות דיגיטליים למשקיעים ישראלים-אמריקאים בנכסים דיגיטליים",
    priority: 'medium',
    seasonal_relevance: "Year-round trending",
    tags: ["cryptocurrency", "bitcoin", "digital assets", "virtual currency", "Form 8949"]
  },

  // Business Structures (High Priority)
  {
    title_english: "LLC Taxation Guide for Israeli Business Owners in the US",
    title_hebrew: "מדריך מיסוי LLC לבעלי עסקים ישראלים בארה\"ב",
    priority: 'high',
    seasonal_relevance: "Business formation season",
    tags: ["LLC", "pass-through taxation", "check-the-box", "single member LLC"]
  },
  {
    title_english: "S-Corp vs LLC: Choosing the Right Structure for Israeli Entrepreneurs",
    title_hebrew: "S-Corp לעומת LLC: בחירת המבנה הנכון ליזמים ישראלים",
    priority: 'high',
    seasonal_relevance: "Jan-Mar formation peak",
    tags: ["S-Corp", "LLC", "entity election", "tax savings", "reasonable salary"]
  },
  {
    title_english: "Transfer Pricing for Small and Medium Israeli-US Businesses",
    title_hebrew: "תמחור העברה לעסקים ישראליים-אמריקאים קטנים ובינוניים",
    priority: 'medium',
    seasonal_relevance: "Year-round compliance",
    tags: ["transfer pricing", "related party transactions", "arm's length", "documentation"]
  },
  {
    title_english: "Business Formation: US vs Israel Entity Selection for Cross-Border Operations",
    title_hebrew: "הקמת עסק: בחירת ישות ארה\"ב לעומת ישראל לפעילות חוצת גבולות",
    priority: 'high',
    seasonal_relevance: "Year-round strategic",
    tags: ["entity selection", "business formation", "tax efficiency", "operational structure"]
  },
  {
    title_english: "E-Commerce Sales Tax Nexus Rules for Israeli Online Sellers",
    title_hebrew: "כללי קשר מס מכירות לסוחרים מקוונים ישראלים",
    priority: 'medium',
    seasonal_relevance: "Ongoing compliance",
    tags: ["sales tax", "nexus", "e-commerce", "marketplace facilitator", "Wayfair"]
  },

  // Retirement & Family (Medium-High Priority)
  {
    title_english: "Israeli Pension Plans and US Tax Treatment: Keren Hishtalmut Guide",
    title_hebrew: "תוכניות פנסיה ישראליות וטיפול מס אמריקאי: מדריך קרן השתלמות",
    priority: 'medium',
    seasonal_relevance: "Retirement planning",
    tags: ["Israeli pension", "Keren Hishtalmut", "foreign pension", "tax treaty benefits"]
  },
  {
    title_english: "US Estate and Gift Tax Planning for Israeli-American Dual Citizens",
    title_hebrew: "תכנון מס עיזבון ומתנה אמריקאי לדו-אזרחים ישראלים-אמריקאים",
    priority: 'medium',
    seasonal_relevance: "Estate planning focus",
    tags: ["estate tax", "gift tax", "unified credit", "portability election"]
  },
  {
    title_english: "Child Tax Credit and Additional Child Tax Credit for US Expats in Israel",
    title_hebrew: "זיכוי מס ילדים וזיכוי מס ילדים נוסף לגולים אמריקאים בישראל",
    priority: 'medium',
    seasonal_relevance: "Jan-Apr filing season",
    tags: ["child tax credit", "ACTC", "expats", "refundable credit", "qualifying child"]
  },
  {
    title_english: "Retirement Account Planning: IRA, 401k, and Israeli Pension Coordination",
    title_hebrew: "תכנון חשבונות פנסיה: תיאום IRA, 401k ופנסיה ישראלית",
    priority: 'medium',
    seasonal_relevance: "Year-end planning",
    tags: ["IRA", "401k", "retirement planning", "contribution limits", "distributions"]
  },

  // Relocation & Planning (Medium Priority)
  {
    title_english: "Aliyah Tax Planning: Complete US Tax Guide for New Israeli Immigrants",
    title_hebrew: "תכנון מס עלייה: מדריך מס אמריקאי מלא למהגרים חדשים לישראל",
    priority: 'medium',
    seasonal_relevance: "Summer Aliyah season",
    tags: ["aliyah", "immigration", "tax planning", "residency change", "foreign earned income"]
  },
  {
    title_english: "Yerida Tax Implications: Leaving Israel for the United States",
    title_hebrew: "השלכות מס ירידה: עזיבת ישראל לארצות הברית",
    priority: 'low',
    seasonal_relevance: "Year-round",
    tags: ["yerida", "emigration", "exit tax", "residency change", "tax planning"]
  },
  {
    title_english: "Year-End Tax Planning Strategies for Israeli-American Taxpayers",
    title_hebrew: "אסטרטגיות תכנון מס סוף שנה למשלמי מס ישראלים-אמריקאים",
    priority: 'high',
    seasonal_relevance: "Oct-Dec peak",
    tags: ["year-end planning", "tax strategies", "income deferral", "deduction acceleration"]
  },

  // Audit & Recovery (Medium Priority)
  {
    title_english: "IRS Audit Defense Guide for International Tax Returns",
    title_hebrew: "מדריך הגנה בביקורת IRS לטפסי מס בינלאומיים",
    priority: 'medium',
    seasonal_relevance: "Year-round defensive",
    tags: ["IRS audit", "audit defense", "international returns", "correspondence audit"]
  },
  {
    title_english: "COVID-19 Stimulus and Recovery Payments for US Citizens Living in Israel",
    title_hebrew: "תשלומי תמריץ והתאוששות קובי-19 לאזרחי ארה\"ב המתגוררים בישראל",
    priority: 'low',
    seasonal_relevance: "Legacy topic",
    tags: ["stimulus payments", "recovery rebate", "economic impact payment", "expats"]
  },
  {
    title_english: "Foreign Tax Credit Optimization: Form 1116 Strategy Guide",
    title_hebrew: "אופטימיזציה של זיכוי מס זר: מדריך אסטרטגיית טופס 1116",
    priority: 'high',
    seasonal_relevance: "Apr filing deadline",
    tags: ["foreign tax credit", "Form 1116", "tax optimization", "double taxation relief"]
  },
  {
    title_english: "US Health Insurance Tax Credits for Israeli-American Expats",
    title_hebrew: "זיכויי מס ביטוח בריאות אמריקאי לגולים ישראלים-אמריקאים",
    priority: 'low',
    seasonal_relevance: "Open enrollment",
    tags: ["health insurance", "premium tax credit", "ACA", "expatriate coverage"]
  }
]

export class TopicSeeder {
  async seedDatabase(): Promise<void> {
    console.log('🌱 Seeding Tax4US topic database...')
    
    const existingTopics = await db.getTopics()
    const existingTitles = existingTopics.map(t => t.title_english)
    
    let seededCount = 0
    let skippedCount = 0
    
    for (const topicData of TAX_TOPICS_SEED) {
      if (existingTitles.includes(topicData.title_english)) {
        skippedCount++
        console.log(`⏭️  Skipped existing topic: ${topicData.title_english}`)
        continue
      }
      
      await db.createTopic(topicData)
      seededCount++
      console.log(`✅ Added topic: ${topicData.title_english}`)
    }
    
    console.log(`🎯 Seeding complete: ${seededCount} added, ${skippedCount} skipped, ${existingTopics.length + seededCount} total topics`)
  }

  async getSeasonalTopics(currentMonth: number): Promise<Topic[]> {
    const allTopics = await db.getTopics()
    
    // Seasonal mapping
    const seasonalPriority = {
      // Tax season peak (Jan-Apr)
      1: ["FBAR", "Form 1040", "FATCA", "filing"],
      2: ["Form 1040", "FBAR", "filing", "deadline"],
      3: ["Form 1040", "extension", "filing", "deadline"],
      4: ["extension", "Form 1040-NR", "deadline", "FBAR"],
      
      // Summer planning (May-Aug)
      5: ["business formation", "planning", "aliyah"],
      6: ["aliyah", "planning", "business formation"],
      7: ["aliyah", "summer planning"],
      8: ["business formation", "planning"],
      
      // Year-end planning (Sep-Dec)
      9: ["year-end planning", "strategies"],
      10: ["extension deadline", "year-end planning", "October"],
      11: ["year-end planning", "strategies", "tax planning"],
      12: ["year-end planning", "capital gains", "strategies"]
    }

    const relevantKeywords = seasonalPriority[currentMonth as keyof typeof seasonalPriority] || []
    
    return allTopics.filter(topic => 
      topic.seasonal_relevance.toLowerCase().includes(new Date().toLocaleString('en', { month: 'short' }).toLowerCase()) ||
      relevantKeywords.some(keyword => 
        topic.tags.some(tag => tag.toLowerCase().includes(keyword.toLowerCase())) ||
        topic.title_english.toLowerCase().includes(keyword.toLowerCase())
      )
    ).sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  async refreshFromNotebook(): Promise<void> {
    // This method would query the NotebookLM to get updated topics
    // For now, we use the hardcoded seed data
    console.log('🔄 Refreshing topics from NotebookLM (future implementation)')
  }
}

export const topicSeeder = new TopicSeeder()