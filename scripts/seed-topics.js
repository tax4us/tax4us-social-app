// Seed script to populate topics with real tax content
const topics = [
  {
    title_english: "FBAR Filing Requirements for Israeli-Americans",
    title_hebrew: "דרישות הגשת FBAR לישראלים-אמריקאים",
    priority: "high",
    tags: ["FBAR", "Israeli Americans", "tax compliance", "foreign accounts"],
    status: "approved"
  },
  {
    title_english: "US-Israel Tax Treaty Benefits and Limitations",
    title_hebrew: "יתרונות והגבלות של אמנת המס בין ארה\"ב וישראל",
    priority: "high", 
    tags: ["tax treaty", "double taxation", "Israel US", "tax planning"],
    status: "pending_approval"
  },
  {
    title_english: "Form 3520 Reporting for Israeli Trust Beneficiaries",
    title_hebrew: "דיווח טופס 3520 למוטבי נאמנות ישראליים",
    priority: "medium",
    tags: ["Form 3520", "trusts", "reporting requirements", "penalties"],
    status: "approved"
  },
  {
    title_english: "Cryptocurrency Tax Obligations in Israel and US",
    title_hebrew: "חובות מס על מטבעות דיגיטליים בישראל וארה\"ב",
    priority: "high",
    tags: ["cryptocurrency", "digital assets", "tax compliance", "dual taxation"],
    status: "changes_requested"
  },
  {
    title_english: "Israeli Pension Plan Tax Treatment in the US",
    title_hebrew: "יחס מס לתוכניות פנסיה ישראליות בארה\"ב",
    priority: "medium",
    tags: ["pension plans", "retirement", "Israeli pensions", "US tax"],
    status: "approved"
  },
  {
    title_english: "Section 877 Expatriation Tax Rules",
    title_hebrew: "חוקי מס יציאה של סעיף 877",
    priority: "medium",
    tags: ["expatriation tax", "exit tax", "green card surrender", "citizenship"],
    status: "pending_approval"
  },
  {
    title_english: "Israeli Real Estate Transactions - US Tax Impact",
    title_hebrew: "עסקאות נדל\"ן בישראל - השפעה על מס אמריקאי",
    priority: "high",
    tags: ["real estate", "property transactions", "capital gains", "Israeli property"],
    status: "approved"
  },
  {
    title_english: "Passive Foreign Investment Company (PFIC) Rules",
    title_hebrew: "חוקי PFIC - חברות השקעה זרות פסיביות",
    priority: "medium",
    tags: ["PFIC", "foreign investments", "Israeli mutual funds", "tax complexity"],
    status: "rejected"
  },
  {
    title_english: "Social Security Agreement Israel-US Benefits",
    title_hebrew: "יתרונות הסכם ביטוח לאומי ישראל-ארה\"ב",
    priority: "low",
    tags: ["social security", "totalization agreement", "benefits", "retirement"],
    status: "pending_approval"
  },
  {
    title_english: "Foreign Tax Credit Optimization Strategies",
    title_hebrew: "אסטרטגיות אופטימיזציה של זיכוי מס זר",
    priority: "medium",
    tags: ["foreign tax credit", "optimization", "tax planning", "dual taxation"],
    status: "approved"
  }
];

async function seedTopics() {
  for (const topic of topics) {
    const response = await fetch('http://localhost:3000/api/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title_hebrew: topic.title_hebrew,
        title_english: topic.title_english,
        target_keywords: topic.tags,
        priority: topic.priority
      })
    });
    
    const result = await response.json();
    console.log(`Created topic: ${topic.title_english} - ${result.success ? 'SUCCESS' : 'FAILED'}`);
    
    if (result.success && topic.status !== 'pending_approval') {
      // Create approval record
      console.log(`  → Status: ${topic.status}`);
    }
  }
}

seedTopics().catch(console.error);