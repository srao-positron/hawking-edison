# User Databank: Simplified Architecture
## Just Web Pages, Embedded and Searchable

### Core Concept
The databank is simply:
- HTML content from web pages the user chose to save
- Converted to embeddings for semantic search
- Searchable by both the orchestrator and agents

That's it. No parsing, no types, no complex metadata.

### How It Works

#### Browser Extension
```typescript
// User clicks extension button on any webpage
async function saveToDatabank() {
  // Get the entire DOM HTML
  const html = document.documentElement.outerHTML;
  const url = window.location.href;
  
  // Send to API
  await api.addToDatabank({
    content: html,
    url: url
  });
  
  // Done!
}
```

#### Backend Storage
```typescript
const addToDatabank = {
  name: "addToDatabank",
  description: "Store web page content in user's databank",
  execute: async (content: string, url: string) => {
    // Generate embedding from HTML content
    const embedding = await generateEmbedding(content);
    
    // Store it
    await supabase.from('databank').insert({
      user_id: userId,
      content: content,
      url: url,
      embedding: embedding
    });
  }
};
```

#### Search Tool
```typescript
const searchDatabank = {
  name: "searchDatabank",
  description: "Search user's saved web pages",
  parameters: {
    query: {
      type: "string",
      description: "What to search for"
    }
  },
  execute: async (query: string) => {
    // Semantic search across all saved pages
    const results = await supabase.rpc('search_databank', {
      query_embedding: await generateEmbedding(query),
      match_count: 10
    });
    
    return results;
  }
};
```

### Database Schema (Simplified)
```sql
CREATE TABLE databank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  content TEXT, -- Raw HTML
  url TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity search function
CREATE FUNCTION search_databank(
  query_embedding vector,
  match_count int DEFAULT 10
) RETURNS TABLE (
  content TEXT,
  url TEXT,
  similarity float
) AS $$
  SELECT 
    content,
    url,
    1 - (embedding <=> query_embedding) as similarity
  FROM databank
  WHERE user_id = auth.uid()
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql;
```

### Usage Examples

#### Example 1: Creating Agent from LinkedIn Profile
```
User: "Create an agent like Sarah Chen"
```

LLM orchestrates:
```typescript
// Search databank for Sarah Chen
const results = await searchDatabank("Sarah Chen LinkedIn");

// If found, use the HTML content to understand who she is
if (results.length > 0) {
  const profileHTML = results[0].content;
  const agentSpec = await llm.extract(`
    From this LinkedIn profile HTML: ${profileHTML}
    Create an agent specification for this person.
  `);
  
  return createAgent(agentSpec);
}
```

#### Example 2: Research-Informed Discussion
```
User: "What do the papers I saved say about climate change?"
```

LLM orchestrates:
```typescript
// Search for climate change content
const papers = await searchDatabank("climate change research");

// Create researcher to analyze
const researcher = await createAgent("Climate scientist");

// Give them the content
researcher.addContext(papers);

// Get analysis
return researcher.analyze("Summarize the climate change research");
```

#### Example 3: Company Context
```
User: "How would this affect our team based on our docs?"
```

LLM orchestrates:
```typescript
// Search for team/company related pages
const companyDocs = await searchDatabank("team company organization");

// Create team members
const team = await createMultipleAgents(5, "company team members");

// Give them context from saved pages
for (const member of team) {
  member.addContext(companyDocs);
}

// Get responses
return gatherIndependentResponses(team, "How does this change affect you?");
```

### The Beauty of Simplicity

1. **No Parsing**: Just save raw HTML
2. **No Categories**: Everything is searchable content
3. **No Structure**: The LLM figures out what the content means
4. **Universal**: Works for any web page
5. **Natural**: Users just save pages they find useful

### What Gets Saved

- LinkedIn profiles → Raw HTML with all profile data
- Research papers → Full HTML including text, figures, citations  
- News articles → Complete article HTML
- Documentation → Technical docs with code examples
- Company pages → About pages, team pages, culture docs
- Anything else → If it's on the web, it can be saved

### Privacy & Performance

- Only stores what user explicitly saves
- Each user's databank is isolated
- Embeddings enable fast semantic search
- No processing or extraction overhead
- Original HTML preserved for full context

### Browser Extension (Complete)

```typescript
// manifest.json
{
  "name": "Hawking Edison Databank",
  "permissions": ["activeTab", "storage"],
  "action": {
    "default_title": "Save to Databank"
  }
}

// background.js
chrome.action.onClicked.addListener(async (tab) => {
  // Inject script to get DOM
  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.documentElement.outerHTML
  });
  
  // Send to API
  await fetch('https://api.hawking-edison.com/databank', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${await getAuthToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: result.result,
      url: tab.url
    })
  });
  
  // Show success
  chrome.action.setBadgeText({ text: '✓' });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000);
});
```

That's the entire databank system. Simple, powerful, flexible.