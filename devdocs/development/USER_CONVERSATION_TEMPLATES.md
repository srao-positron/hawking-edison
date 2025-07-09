# User Conversation Templates

## Overview

These templates guide the conversational UI to help non-technical users like Sarah achieve their goals without confusion. Each template follows a pattern of understanding intent, gathering minimal required information, and providing immediate value.

## Core Conversation Patterns

### Pattern 1: Message Testing

```yaml
User Intent Variations:
  - "I need to test a message"
  - "How will people react to this announcement"
  - "Will customers like this"
  - "Test member response to"

System Response Flow:
  1. Acknowledge and Clarify:
     "I'll help you test how people will react to your message. What type of message is this?"
     Options: 
     - Announcement (policy, pricing, service)
     - Marketing (campaign, promotion, product)
     - Internal (team, company-wide)
     - Other (let me describe)

  2. Gather Message:
     "Great! Please paste your message below, or describe what you want to communicate:"
     
  3. Identify Audience:
     "Who needs to see this message? I can test with:"
     - All [customers/members/employees]
     - Specific group: [describe]
     - Multiple segments for comparison
     - Use my saved audience

  4. Confirm and Start:
     "I'll test your [type] message with [size] [audience description]. 
      This will take about 30 seconds. Ready to start?"

  5. Show Progress:
     "Creating 1,000 synthetic [audience]..." (animated)
     "Running simulation..." (progress bar)
     "Analyzing responses..." (processing)
     "Generating insights..." (final step)
```

### Pattern 2: Decision Support

```yaml
User Intent Variations:
  - "Help me decide"
  - "Should we"
  - "What's the best option"
  - "Compare these choices"

System Response Flow:
  1. Understand Decision:
     "I'll help you make this decision. What are you trying to decide?"
     
  2. Identify Options:
     "What options are you considering?"
     - Option A: [user describes]
     - Option B: [user describes]
     - Add more options
     
  3. Identify Stakeholders:
     "Who will be affected by this decision?"
     - Customers/Members
     - Employees  
     - Leadership
     - Community
     - Multiple groups

  4. Clarify Criteria:
     "What's most important for this decision?"
     - Cost savings
     - Customer satisfaction
     - Employee morale
     - Risk reduction
     - Growth potential
     - Other

  5. Run Analysis:
     "I'll analyze how [stakeholders] will react to each option based on [criteria]..."
```

### Pattern 3: Policy Testing

```yaml
User Intent Variations:
  - "New policy"
  - "Policy change"
  - "Rule update"
  - "Procedure modification"

System Response Flow:
  1. Current vs New:
     "I'll help you test this policy change. First, briefly describe:"
     - Current policy: [optional]
     - New policy: [required]
     
  2. Impact Assessment:
     "Who does this policy affect?"
     Pre-populated options based on policy type
     
  3. Concern Prediction:
     "I'll analyze potential concerns and reactions. Any specific aspects to focus on?"
     - Fairness
     - Practicality
     - Cost/benefit
     - Ease of implementation
     
  4. Run Simulation:
     "Testing policy acceptance with [audience]..."
```

## Quick Start Templates

### Template: Fee/Price Increase

```
System: "I see you want to test a fee increase. Let me help you get the best response.

First, what's changing?"
[Pre-filled form:]
- Current: $[  ]
- New: $[  ]
- Service: [dropdown]

"How would you like to position this?"
[Suggestions:]
- Enhanced security and fraud protection
- Improved service quality
- Market alignment
- Investment in new features

"I'll test both the basic announcement and these positioning options with 1,000 members."
```

### Template: New Service Launch

```
System: "Launching something new? Let's make sure it resonates with your audience.

What are you launching?"
[Categories:]
- Digital service
- Financial product  
- Membership benefit
- Facility/location

"What's the main benefit?"
[One sentence input]

"Who's your target audience?"
[Smart defaults based on service type]

"I'll test appeal, concerns, and adoption likelihood."
```

## Conversation Principles

### 1. Always Acknowledge Intent
```
Good: "I'll help you test how people will react to your message."
Bad: "Please select simulation type from the following options..."
```

### 2. Use Natural Language
```
Good: "Who needs to see this message?"
Bad: "Select target demographic parameters:"
```

### 3. Provide Smart Defaults
```
Good: "I'll test with 1,000 diverse members (change)"
Bad: "Enter simulation size (100-10000):"
```

### 4. Explain in Context
```
Good: "This will take about 30 seconds"
Bad: "Processing time varies based on complexity"
```

### 5. Progressive Disclosure
```
Initial: Simple question
If needed: "Would you like to be more specific?"
Advanced: Show additional options
```

## Error Handling Conversations

### Unclear Input
```
User: "Test something"
System: "I'd be happy to help you test something! Are you looking to test:
         • A message or announcement 📢
         • A new policy or change 📋
         • A decision you need to make 🤔
         • Something else?
         
         Just tell me in your own words what you'd like to test."
```

### Too Complex Request
```
User: [Very long, complex multi-part request]
System: "I understand you have several things to test. Let's start with the most important one first. 
         
         Which of these would you like to test now:
         1. [Extracted key point 1]
         2. [Extracted key point 2]
         
         We can test the others right after!"
```

### Missing Information
```
System: "I almost have everything I need. Just one more question:
         Who should we test this with? If you're not sure, I can test with a general audience of [context-appropriate default]."
```

## Success Patterns

### Immediate Value
```
"Here's what I found: 68% positive response! 🎉

Top 3 things people liked:
1. Clear communication
2. Fair pricing
3. Added value

Main concern to address:
- Implementation timeline (23% wanted more details)

Want to test a revised version?"
```

### Actionable Insights
```
"Based on the simulation, here are 3 ways to improve response:

1. Add specific examples (increases positive by ~15%)
2. Address cost concerns upfront (reduces negative by ~20%)  
3. Include a FAQ section (improves clarity score by 30%)

Would you like me to show you how these changes would work?"
```

## Advanced User Shortcuts

For users who become familiar with the system:

```
Power User: "Test fee increase $3->$5 with seniors"
System: "Testing $3 to $5 fee increase with members 65+... [proceeds directly]"

Power User: "@template price-increase"
System: [Loads price increase template immediately]

Power User: "Repeat last but with families"  
System: "Re-running previous simulation with families instead..."
```

## Voice and Tone

- **Friendly Expert**: Like a knowledgeable colleague
- **Encouraging**: "Great question!" "Good thinking!"
- **Clear**: No jargon, simple explanations
- **Proactive**: Anticipate next steps
- **Positive**: Focus on opportunities, not just problems